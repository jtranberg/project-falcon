#include <algorithm>
#include <atomic>
#include <chrono>
#include <cmath>
#include <csignal>
#include <cstdlib>
#include <ctime>
#include <iomanip>
#include <iostream>
#include <mutex>
#include <random>
#include <sstream>
#include <stdexcept>
#include <string>
#include <thread>
#include <utility>

#include <mqtt/async_client.h>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

namespace {

constexpr int QOS = 1;
constexpr int TELEMETRY_INTERVAL_MS = 500;

constexpr double HOME_LATITUDE = 48.4284;
constexpr double HOME_LONGITUDE = -123.3656;

std::atomic<bool> running{true};

std::string getEnvironmentValue(
    const char* name,
    const std::string& fallback
) {
    const char* value = std::getenv(name);

    if (value == nullptr || std::string(value).empty()) {
        return fallback;
    }

    return value;
}

std::string createIsoTimestamp() {
    const auto now = std::chrono::system_clock::now();

    const auto milliseconds =
        std::chrono::duration_cast<std::chrono::milliseconds>(
            now.time_since_epoch()
        ) %
        1000;

    const std::time_t currentTime =
        std::chrono::system_clock::to_time_t(now);

    std::tm utcTime{};

#ifdef _WIN32
    gmtime_s(&utcTime, &currentTime);
#else
    gmtime_r(&currentTime, &utcTime);
#endif

    std::ostringstream output;

    output
        << std::put_time(&utcTime, "%Y-%m-%dT%H:%M:%S")
        << '.'
        << std::setfill('0')
        << std::setw(3)
        << milliseconds.count()
        << 'Z';

    return output.str();
}

void handleSignal(int) {
    running = false;
}

double clampValue(
    const double value,
    const double minimum,
    const double maximum
) {
    return std::max(
        minimum,
        std::min(value, maximum)
    );
}

double moveToward(
    const double current,
    const double target,
    const double maximumStep
) {
    const double difference = target - current;

    if (std::abs(difference) <= maximumStep) {
        return target;
    }

    return current +
        std::copysign(maximumStep, difference);
}

enum class FlightState {
    Mission,
    Hover,
    Paused,
    ReturnToHome,
    Landing,
    Landed
};

std::string flightStateToString(
    const FlightState state
) {
    switch (state) {
        case FlightState::Mission:
            return "MISSION";

        case FlightState::Hover:
            return "HOVER";

        case FlightState::Paused:
            return "PAUSED";

        case FlightState::ReturnToHome:
            return "RETURN_TO_HOME";

        case FlightState::Landing:
            return "LANDING";

        case FlightState::Landed:
            return "LANDED";
    }

    return "UNKNOWN";
}

class FalconDrone final : public virtual mqtt::callback {
public:
    FalconDrone(
        std::string brokerUrl,
        std::string droneId,
        std::string mqttUsername,
        std::string mqttPassword
    )
        : brokerUrl_(std::move(brokerUrl)),
          droneId_(std::move(droneId)),
          mqttUsername_(std::move(mqttUsername)),
          mqttPassword_(std::move(mqttPassword)),
          clientId_("falcon-native-" + droneId_),
          telemetryTopic_(
              "falcon/drones/" +
              droneId_ +
              "/telemetry"
          ),
          statusTopic_(
              "falcon/drones/" +
              droneId_ +
              "/status"
          ),
          commandTopic_(
              "falcon/drones/" +
              droneId_ +
              "/commands"
          ),
          commandStatusTopic_(
              "falcon/drones/" +
              droneId_ +
              "/command-status"
          ),
          client_(brokerUrl_, clientId_),
          randomEngine_(std::random_device{}()),
          altitudeNoise_(-0.45, 0.45),
          headingNoise_(-0.8, 0.8),
          speedNoise_(-0.15, 0.15),
          temperatureNoise_(-0.04, 0.06),
          signalNoise_(-1, 1) {
        client_.set_callback(*this);
    }

    void connect() {
        mqtt::connect_options options;

        options.set_clean_session(true);
        options.set_automatic_reconnect(false);
        options.set_keep_alive_interval(20);
        options.set_connect_timeout(10);

        if (!mqttUsername_.empty()) {
            options.set_user_name(mqttUsername_);
        }

        if (!mqttPassword_.empty()) {
            options.set_password(mqttPassword_);
        }

        const json offlineStatus = {
            {"schemaVersion", 1},
            {"droneId", droneId_},
            {"status", "OFFLINE"},
            {"timestamp", createIsoTimestamp()}
        };

        options.set_will(
            mqtt::message(
                statusTopic_,
                offlineStatus.dump(),
                QOS,
                true
            )
        );

        std::cout
            << "Connecting to MQTT broker: "
            << brokerUrl_
            << '\n';

        client_.connect(options)->wait();

        std::cout
            << "MQTT connection completed."
            << '\n';

        subscribeToCommands();

        std::cout
            << "Command subscription completed."
            << '\n';

        publishStatusBlocking("ONLINE");

        std::cout
            << "ONLINE status published."
            << '\n';

        std::cout
            << droneId_
            << " connected successfully."
            << '\n';

        std::cout
            << "Publishing telemetry to: "
            << telemetryTopic_
            << '\n';

        std::cout
            << "Listening for commands on: "
            << commandTopic_
            << '\n';

        std::cout
            << "Publishing command status to: "
            << commandStatusTopic_
            << '\n';
    }

    void run() {
        while (running) {
            updateAircraftState();
            publishTelemetry();

            std::this_thread::sleep_for(
                std::chrono::milliseconds(
                    TELEMETRY_INTERVAL_MS
                )
            );
        }
    }

    void disconnect() {
        if (!client_.is_connected()) {
            return;
        }

        try {
            publishStatusBlocking("OFFLINE");

            client_.disconnect()->wait();

            std::cout
                << droneId_
                << " disconnected."
                << '\n';
        } catch (const mqtt::exception& error) {
            std::cerr
                << "MQTT disconnect error: "
                << error.what()
                << '\n';
        }
    }

    void connection_lost(
        const std::string& cause
    ) override {
        std::cerr
            << "MQTT connection lost";

        if (!cause.empty()) {
            std::cerr
                << ": "
                << cause;
        }

        std::cerr << '\n';

        running = false;
    }

    void message_arrived(
        mqtt::const_message_ptr message
    ) override {
        if (!message) {
            return;
        }

        if (message->get_topic() != commandTopic_) {
            return;
        }

        handleCommand(message->to_string());
    }

    void delivery_complete(
        mqtt::delivery_token_ptr
    ) override {
    }

private:
    void subscribeToCommands() {
        if (!client_.is_connected()) {
            throw std::runtime_error(
                "Cannot subscribe because MQTT is not connected."
            );
        }

        client_
            .subscribe(commandTopic_, QOS)
            ->wait();
    }

    void handleCommand(
        const std::string& rawPayload
    ) {
        std::string commandId = "unknown";
        std::string command = "UNKNOWN";

        try {
            const json payload =
                json::parse(rawPayload);

            if (!payload.is_object()) {
                throw std::runtime_error(
                    "Command payload must be a JSON object."
                );
            }

            commandId =
                payload.value(
                    "commandId",
                    "unknown"
                );

            command =
                payload.value(
                    "command",
                    ""
                );

            if (command.empty()) {
                publishCommandStatusAsync(
                    commandId,
                    "UNKNOWN",
                    "REJECTED",
                    "Missing command."
                );

                return;
            }

            std::string rejectionReason;
            std::string successDetail = "Command applied.";
            bool accepted = false;

            {
                std::lock_guard<std::mutex> lock(
                    stateMutex_
                );

                accepted = applyCommand(
                    command,
                    payload,
                    rejectionReason,
                    successDetail
                );
            }

            if (!accepted) {
                publishCommandStatusAsync(
                    commandId,
                    command,
                    "REJECTED",
                    rejectionReason
                );

                std::cerr
                    << "Command rejected: "
                    << command
                    << " ("
                    << commandId
                    << ")"
                    << " | "
                    << rejectionReason
                    << '\n';

                return;
            }

            publishCommandStatusAsync(
                commandId,
                command,
                "ACCEPTED",
                successDetail
            );

            std::cout
                << "Command accepted: "
                << command
                << " ("
                << commandId
                << ")"
                << '\n';
        } catch (const json::exception& error) {
            publishCommandStatusAsync(
                commandId,
                command,
                "REJECTED",
                std::string("Invalid JSON: ") +
                    error.what()
            );

            std::cerr
                << "Rejected malformed command payload: "
                << error.what()
                << '\n';
        } catch (const std::exception& error) {
            publishCommandStatusAsync(
                commandId,
                command,
                "REJECTED",
                error.what()
            );

            std::cerr
                << "Command processing error: "
                << error.what()
                << '\n';
        }
    }

    bool applyCommand(
        const std::string& command,
        const json& payload,
        std::string& rejectionReason,
        std::string& successDetail
    ) {
        const json parameters =
            payload.contains("parameters") &&
            payload["parameters"].is_object()
                ? payload["parameters"]
                : json::object();

        const auto readNumericParameter =
            [&payload, &parameters](
                const char* name,
                double& value
            ) -> bool {
                const json* source = nullptr;

                if (
                    parameters.contains(name) &&
                    parameters[name].is_number()
                ) {
                    source = &parameters[name];
                } else if (
                    payload.contains(name) &&
                    payload[name].is_number()
                ) {
                    // Backward-compatible fallback for older publishers.
                    source = &payload[name];
                }

                if (source == nullptr) {
                    return false;
                }

                value = source->get<double>();

                return std::isfinite(value);
            };

        const auto clearGuidedTargets = [this]() {
            altitudeCommandActive_ = false;
            headingCommandActive_ = false;
        };

        if (command == "START_MISSION") {
            clearGuidedTargets();

            flightState_ = FlightState::Mission;
            targetAltitudeM_ = 120.0;
            targetSpeedMps_ = 14.5;

            return true;
        }

        if (command == "PAUSE_MISSION") {
            if (flightState_ == FlightState::Landed) {
                rejectionReason =
                    "Cannot pause a mission while "
                    "the aircraft is landed.";

                return false;
            }

            clearGuidedTargets();

            flightState_ = FlightState::Paused;
            targetAltitudeM_ = altitudeM_;
            targetSpeedMps_ = 0.0;

            return true;
        }

        if (command == "RESUME_MISSION") {
            if (flightState_ == FlightState::Landed) {
                rejectionReason =
                    "Use START_MISSION to launch "
                    "a landed aircraft.";

                return false;
            }

            clearGuidedTargets();

            flightState_ = FlightState::Mission;
            targetAltitudeM_ = 120.0;
            targetSpeedMps_ = 14.5;

            return true;
        }

        if (command == "HOVER") {
            if (flightState_ == FlightState::Landed) {
                rejectionReason =
                    "Cannot hover while the "
                    "aircraft is landed.";

                return false;
            }

            clearGuidedTargets();

            flightState_ = FlightState::Hover;
            targetAltitudeM_ = altitudeM_;
            targetSpeedMps_ = 0.0;

            return true;
        }

        if (command == "SET_ALTITUDE") {
            if (flightState_ == FlightState::Landed) {
                rejectionReason =
                    "Cannot set altitude while the "
                    "aircraft is landed.";

                return false;
            }

            double requestedAltitudeM = 0.0;

            if (
                !readNumericParameter(
                    "altitudeM",
                    requestedAltitudeM
                )
            ) {
                rejectionReason =
                    "SET_ALTITUDE requires a numeric "
                    "parameters.altitudeM value.";

                return false;
            }

            if (
                requestedAltitudeM < 1.0 ||
                requestedAltitudeM > 500.0
            ) {
                rejectionReason =
                    "Altitude must be between "
                    "1 and 500 metres.";

                return false;
            }

            flightState_ = FlightState::Hover;
            targetAltitudeM_ = requestedAltitudeM;
            targetSpeedMps_ = 0.0;
            altitudeCommandActive_ = true;

            std::ostringstream detail;

            detail
                << "Altitude target set to "
                << std::fixed
                << std::setprecision(1)
                << targetAltitudeM_
                << " m.";

            successDetail = detail.str();

            return true;
        }

        if (command == "SET_HEADING") {
            if (flightState_ == FlightState::Landed) {
                rejectionReason =
                    "Cannot set heading while the "
                    "aircraft is landed.";

                return false;
            }

            double requestedHeadingDeg = 0.0;

            if (
                !readNumericParameter(
                    "headingDeg",
                    requestedHeadingDeg
                )
            ) {
                rejectionReason =
                    "SET_HEADING requires a numeric "
                    "parameters.headingDeg value.";

                return false;
            }

            if (
                requestedHeadingDeg < 0.0 ||
                requestedHeadingDeg > 360.0
            ) {
                rejectionReason =
                    "Heading must be between "
                    "0 and 360 degrees.";

                return false;
            }

            if (requestedHeadingDeg == 360.0) {
                requestedHeadingDeg = 0.0;
            }

            flightState_ = FlightState::Hover;
            targetHeadingDeg_ = requestedHeadingDeg;
            targetSpeedMps_ = 0.0;
            headingCommandActive_ = true;

            std::ostringstream detail;

            detail
                << "Heading target set to "
                << std::fixed
                << std::setprecision(1)
                << targetHeadingDeg_
                << " degrees.";

            successDetail = detail.str();

            return true;
        }

        if (
            command == "RETURN_TO_HOME" ||
            command == "RETURN_TO_BASE"
        ) {
            if (flightState_ == FlightState::Landed) {
                rejectionReason =
                    "Aircraft is already landed.";

                return false;
            }

            clearGuidedTargets();

            altitudeCommandActive_ = false;
            headingCommandActive_ = false;

            flightState_ =
                FlightState::ReturnToHome;

            targetAltitudeM_ = 35.0;
            targetSpeedMps_ = 8.0;

            return true;
        }

        if (command == "LAND") {
            if (flightState_ == FlightState::Landed) {
                rejectionReason =
                    "Aircraft is already landed.";

                return false;
            }

            clearGuidedTargets();

            flightState_ = FlightState::Landing;
            targetAltitudeM_ = 0.0;
            targetSpeedMps_ = 0.0;

            return true;
        }

        rejectionReason =
            "Unsupported command. Supported commands are "
            "START_MISSION, PAUSE_MISSION, RESUME_MISSION, "
            "HOVER, SET_ALTITUDE, SET_HEADING, "
            "RETURN_TO_HOME, and LAND.";

        return false;
    }

    void updateAircraftState() {
        std::lock_guard<std::mutex> lock(
            stateMutex_
        );

        if (
            batteryPercent_ <= 15.0 &&
            flightState_ != FlightState::Landing &&
            flightState_ != FlightState::Landed
        ) {
            flightState_ =
                FlightState::ReturnToHome;

            targetAltitudeM_ = 35.0;
            targetSpeedMps_ = 8.0;
        }

        switch (flightState_) {
            case FlightState::Mission:
                targetAltitudeM_ = 120.0;
                targetSpeedMps_ = 14.5;
                updateMissionPosition();
                break;

            case FlightState::Hover:
            case FlightState::Paused:
                if (!altitudeCommandActive_) {
                    targetAltitudeM_ = altitudeM_;
                }

                targetSpeedMps_ = 0.0;
                break;

            case FlightState::ReturnToHome:
                targetAltitudeM_ = 35.0;
                targetSpeedMps_ = 8.0;
                updateReturnHomePosition();
                break;

            case FlightState::Landing:
                targetAltitudeM_ = 0.0;
                targetSpeedMps_ = 0.0;

                if (altitudeM_ <= 0.5) {
                    altitudeM_ = 0.0;
                    targetAltitudeM_ = 0.0;
                    targetSpeedMps_ = 0.0;
                    flightState_ = FlightState::Landed;
                }

                break;

            case FlightState::Landed:
                altitudeM_ = 0.0;
                targetAltitudeM_ = 0.0;
                speedMps_ = 0.0;
                targetSpeedMps_ = 0.0;
                break;
        }

        if (flightState_ != FlightState::Landed) {
            altitudeM_ = moveToward(
                altitudeM_,
                targetAltitudeM_,
                flightState_ == FlightState::Landing
                    ? 2.5
                    : 1.8
            );

            altitudeM_ +=
                altitudeNoise_(randomEngine_);

            altitudeM_ = clampValue(
                altitudeM_,
                0.0,
                500.0
            );

            if (
                altitudeCommandActive_ &&
                std::abs(
                    targetAltitudeM_ -
                    altitudeM_
                ) <= 0.75
            ) {
                altitudeM_ = targetAltitudeM_;
                altitudeCommandActive_ = false;
            }
        }

        if (headingCommandActive_) {
            double headingDifference =
                std::fmod(
                    targetHeadingDeg_ -
                    headingDeg_ +
                    540.0,
                    360.0
                ) -
                180.0;

            if (std::abs(headingDifference) <= 2.5) {
                headingDeg_ = targetHeadingDeg_;
                headingCommandActive_ = false;
            } else {
                headingDeg_ +=
                    std::copysign(
                        std::min(
                            std::abs(headingDifference),
                            2.5
                        ),
                        headingDifference
                    );
            }
        } else if (
            flightState_ == FlightState::Mission ||
            flightState_ == FlightState::ReturnToHome
        ) {
            headingDeg_ +=
                0.35 +
                headingNoise_(randomEngine_);
        }

        headingDeg_ =
            std::fmod(
                headingDeg_ + 360.0,
                360.0
            );

        speedMps_ = moveToward(
            speedMps_,
            targetSpeedMps_,
            0.8
        );

        if (
            flightState_ == FlightState::Mission ||
            flightState_ == FlightState::ReturnToHome
        ) {
            speedMps_ = clampValue(
                speedMps_ +
                    speedNoise_(randomEngine_),
                0.0,
                28.0
            );
        } else {
            speedMps_ = clampValue(
                speedMps_,
                0.0,
                28.0
            );
        }

        const double batteryDrain =
            flightState_ == FlightState::Landed
                ? 0.001
                : 0.015;

        batteryPercent_ = clampValue(
            batteryPercent_ - batteryDrain,
            0.0,
            100.0
        );

        temperatureC_ = clampValue(
            temperatureC_ +
                temperatureNoise_(randomEngine_),
            20.0,
            75.0
        );

        signalDbm_ = static_cast<int>(
            clampValue(
                static_cast<double>(
                    signalDbm_ +
                    signalNoise_(randomEngine_)
                ),
                -95.0,
                -35.0
            )
        );
    }

    void updateMissionPosition() {
        latitude_ += 0.0000025;
        longitude_ += 0.0000018;
    }

    void updateReturnHomePosition() {
        latitude_ = moveToward(
            latitude_,
            HOME_LATITUDE,
            0.000006
        );

        longitude_ = moveToward(
            longitude_,
            HOME_LONGITUDE,
            0.000006
        );

        const double latitudeDifference =
            HOME_LATITUDE - latitude_;

        const double longitudeDifference =
            HOME_LONGITUDE - longitude_;

        if (
            std::abs(latitudeDifference) < 0.00001 &&
            std::abs(longitudeDifference) < 0.00001
        ) {
            latitude_ = HOME_LATITUDE;
            longitude_ = HOME_LONGITUDE;

            flightState_ = FlightState::Hover;

            targetAltitudeM_ = altitudeM_;
            targetSpeedMps_ = 0.0;
        }
    }

    void publishTelemetry() {
        json payload;

        unsigned long long sequence = 0;

        std::string flightMode;

        double altitude = 0.0;
        double battery = 0.0;
        double heading = 0.0;
        double speed = 0.0;

        {
            std::lock_guard<std::mutex> lock(
                stateMutex_
            );

            sequence_ += 1;
            sequence = sequence_;

            const double voltage =
                22.0 +
                batteryPercent_ * 0.018;

            flightMode =
                flightStateToString(flightState_);

            altitude = altitudeM_;
            battery = batteryPercent_;
            heading = headingDeg_;
            speed = speedMps_;

            payload = {
                {"schemaVersion", 1},
                {"droneId", droneId_},
                {"timestamp", createIsoTimestamp()},
                {"sequence", sequence},
                {
                    "position",
                    {
                        {"latitude", latitude_},
                        {"longitude", longitude_},
                        {"altitudeM", altitudeM_}
                    }
                },
                {
                    "motion",
                    {
                        {"speedMps", speedMps_},
                        {"headingDeg", headingDeg_}
                    }
                },
                {
                    "power",
                    {
                        {
                            "batteryPercent",
                            batteryPercent_
                        },
                        {"voltageV", voltage}
                    }
                },
                {
                    "health",
                    {
                        {
                            "temperatureC",
                            temperatureC_
                        },
                        {"signalDbm", signalDbm_},
                        {"gpsFix", true}
                    }
                },
                {"flightMode", flightMode}
            };
        }

        if (!client_.is_connected()) {
            return;
        }

        try {
            const auto message =
                mqtt::make_message(
                    telemetryTopic_,
                    payload.dump()
                );

            message->set_qos(QOS);
            message->set_retained(false);

            client_.publish(message)->wait();

            std::cout
                << "["
                << sequence
                << "] "
                << droneId_
                << " | mode="
                << flightMode
                << " | altitude="
                << std::fixed
                << std::setprecision(1)
                << altitude
                << " m"
                << " | battery="
                << battery
                << "%"
                << " | heading="
                << heading
                << " deg"
                << " | speed="
                << speed
                << " m/s"
                << '\n';
        } catch (const mqtt::exception& error) {
            std::cerr
                << "Telemetry publish error: "
                << error.what()
                << '\n';
        }
    }

    void publishStatusBlocking(
        const std::string& status
    ) {
        if (!client_.is_connected()) {
            return;
        }

        const json payload = {
            {"schemaVersion", 1},
            {"droneId", droneId_},
            {"status", status},
            {"timestamp", createIsoTimestamp()}
        };

        const auto message =
            mqtt::make_message(
                statusTopic_,
                payload.dump()
            );

        message->set_qos(QOS);
        message->set_retained(true);

        client_.publish(message)->wait();
    }

    void publishCommandStatusAsync(
        const std::string& commandId,
        const std::string& command,
        const std::string& status,
        const std::string& detail
    ) {
        if (!client_.is_connected()) {
            return;
        }

        std::string flightMode;

        {
            std::lock_guard<std::mutex> lock(
                stateMutex_
            );

            flightMode =
                flightStateToString(flightState_);
        }

        const json payload = {
            {"schemaVersion", 1},
            {"commandId", commandId},
            {"droneId", droneId_},
            {"command", command},
            {"status", status},
            {"detail", detail},
            {"flightMode", flightMode},
            {"timestamp", createIsoTimestamp()}
        };

        try {
            const auto message =
                mqtt::make_message(
                    commandStatusTopic_,
                    payload.dump()
                );

            message->set_qos(QOS);
            message->set_retained(false);

            // Do not call wait() here.
            // This method runs from the MQTT callback thread.
            client_.publish(message);
        } catch (const mqtt::exception& error) {
            std::cerr
                << "Command status publish error: "
                << error.what()
                << '\n';
        }
    }

    std::string brokerUrl_;
    std::string droneId_;
    std::string mqttUsername_;
    std::string mqttPassword_;
    std::string clientId_;

    std::string telemetryTopic_;
    std::string statusTopic_;
    std::string commandTopic_;
    std::string commandStatusTopic_;

    mqtt::async_client client_;

    std::mutex stateMutex_;

    std::mt19937 randomEngine_;

    std::uniform_real_distribution<double>
        altitudeNoise_;

    std::uniform_real_distribution<double>
        headingNoise_;

    std::uniform_real_distribution<double>
        speedNoise_;

    std::uniform_real_distribution<double>
        temperatureNoise_;

    std::uniform_int_distribution<int>
        signalNoise_;

    unsigned long long sequence_ = 0;

    double latitude_ = HOME_LATITUDE;
    double longitude_ = HOME_LONGITUDE;

    double altitudeM_ = 120.0;
    double targetAltitudeM_ = 120.0;
    bool altitudeCommandActive_ = false;

    double headingDeg_ = 180.0;
    double targetHeadingDeg_ = 180.0;
    bool headingCommandActive_ = false;

    double speedMps_ = 14.5;
    double targetSpeedMps_ = 14.5;

    double batteryPercent_ = 100.0;
    double temperatureC_ = 34.0;

    int signalDbm_ = -54;

    FlightState flightState_ =
        FlightState::Mission;
};

} // namespace

int main(
    const int argc,
    char* argv[]
) {
    std::signal(SIGINT, handleSignal);
    std::signal(SIGTERM, handleSignal);

    const std::string brokerUrl =
        argc > 1
            ? argv[1]
            : getEnvironmentValue(
                "FALCON_MQTT_URL",
                "tcp://localhost:1883"
            );

    const std::string droneId =
        argc > 2
            ? argv[2]
            : getEnvironmentValue(
                "FALCON_DRONE_ID",
                "falcon-05"
            );

    const std::string mqttUsername =
        getEnvironmentValue(
            "FALCON_MQTT_USERNAME",
            ""
        );

    const std::string mqttPassword =
        getEnvironmentValue(
            "FALCON_MQTT_PASSWORD",
            ""
        );

    try {
        FalconDrone drone(
            brokerUrl,
            droneId,
            mqttUsername,
            mqttPassword
        );

        drone.connect();
        drone.run();
        drone.disconnect();

        return 0;
    } catch (const mqtt::exception& error) {
        std::cerr
            << "MQTT error: "
            << error.what()
            << '\n';

        return 1;
    } catch (const std::exception& error) {
        std::cerr
            << "Drone client error: "
            << error.what()
            << '\n';

        return 1;
    }
}