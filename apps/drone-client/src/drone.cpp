#include <atomic>
#include <chrono>
#include <cmath>
#include <csignal>
#include <cstdlib>
#include <iomanip>
#include <iostream>
#include <random>
#include <sstream>
#include <string>
#include <thread>

#include <mqtt/async_client.h>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

namespace {

constexpr int QOS = 1;
constexpr int TELEMETRY_INTERVAL_MS = 500;

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
    return std::max(minimum, std::min(value, maximum));
}

class FalconDrone {
public:
    FalconDrone(
        std::string brokerUrl,
        std::string droneId
    )
        : brokerUrl_(std::move(brokerUrl)),
          droneId_(std::move(droneId)),
          clientId_("falcon-native-" + droneId_),
          telemetryTopic_("falcon/drones/" + droneId_ + "/telemetry"),
          statusTopic_("falcon/drones/" + droneId_ + "/status"),
          client_(brokerUrl_, clientId_),
          randomEngine_(std::random_device{}()),
          altitudeNoise_(-0.45, 0.45),
          headingNoise_(-0.8, 0.8),
          speedNoise_(-0.15, 0.15),
          temperatureNoise_(-0.04, 0.06),
          signalNoise_(-1, 1) {}

    void connect() {
        mqtt::connect_options options;

        options.set_clean_session(true);
        options.set_automatic_reconnect(true);

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

        publishStatus("ONLINE");

        std::cout
            << droneId_
            << " connected successfully."
            << '\n';

        std::cout
            << "Publishing telemetry to: "
            << telemetryTopic_
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

        publishStatus("OFFLINE");

        client_.disconnect()->wait();

        std::cout
            << droneId_
            << " disconnected."
            << '\n';
    }

private:
    void updateAircraftState() {
        const double altitudeDifference =
            targetAltitudeM_ - altitudeM_;

        if (std::abs(altitudeDifference) > 0.5) {
            const double adjustment =
                std::copysign(
                    std::min(
                        std::abs(altitudeDifference),
                        1.8
                    ),
                    altitudeDifference
                );

            altitudeM_ += adjustment;
        }

        altitudeM_ += altitudeNoise_(randomEngine_);
        altitudeM_ = clampValue(
            altitudeM_,
            0.0,
            500.0
        );

        headingDeg_ +=
            0.35 + headingNoise_(randomEngine_);

        if (headingDeg_ >= 360.0) {
            headingDeg_ -= 360.0;
        }

        if (headingDeg_ < 0.0) {
            headingDeg_ += 360.0;
        }

        speedMps_ = clampValue(
            speedMps_ + speedNoise_(randomEngine_),
            0.0,
            28.0
        );

        batteryPercent_ = clampValue(
            batteryPercent_ - 0.015,
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

        latitude_ += 0.0000025;
        longitude_ += 0.0000018;

        if (batteryPercent_ <= 15.0) {
            flightMode_ = "RETURN_TO_BASE";
            targetAltitudeM_ = 35.0;
            speedMps_ = 8.0;
        }
    }

    void publishTelemetry() {
        sequence_ += 1;

        const double voltage =
            22.0 + batteryPercent_ * 0.018;

        const json payload = {
            {"schemaVersion", 1},
            {"droneId", droneId_},
            {"timestamp", createIsoTimestamp()},
            {"sequence", sequence_},

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
                    {"batteryPercent", batteryPercent_},
                    {"voltageV", voltage}
                }
            },

            {
                "health",
                {
                    {"temperatureC", temperatureC_},
                    {"signalDbm", signalDbm_},
                    {"gpsFix", true}
                }
            },

            {"flightMode", flightMode_}
        };

        const auto message = mqtt::make_message(
            telemetryTopic_,
            payload.dump()
        );

        message->set_qos(QOS);
        message->set_retained(false);

        client_.publish(message)->wait();

        std::cout
            << "["
            << sequence_
            << "] "
            << droneId_
            << " | altitude="
            << std::fixed
            << std::setprecision(1)
            << altitudeM_
            << " m"
            << " | battery="
            << batteryPercent_
            << "%"
            << " | heading="
            << headingDeg_
            << " deg"
            << " | speed="
            << speedMps_
            << " m/s"
            << '\n';
    }

    void publishStatus(
        const std::string& status
    ) {
        const json payload = {
            {"schemaVersion", 1},
            {"droneId", droneId_},
            {"status", status},
            {"timestamp", createIsoTimestamp()}
        };

        const auto message = mqtt::make_message(
            statusTopic_,
            payload.dump()
        );

        message->set_qos(QOS);
        message->set_retained(true);

        client_.publish(message)->wait();
    }

    std::string brokerUrl_;
    std::string droneId_;
    std::string clientId_;
    std::string telemetryTopic_;
    std::string statusTopic_;

    mqtt::async_client client_;

    std::mt19937 randomEngine_;
    std::uniform_real_distribution<double> altitudeNoise_;
    std::uniform_real_distribution<double> headingNoise_;
    std::uniform_real_distribution<double> speedNoise_;
    std::uniform_real_distribution<double> temperatureNoise_;
    std::uniform_int_distribution<int> signalNoise_;

    unsigned long long sequence_ = 0;

    double latitude_ = 48.4284;
    double longitude_ = -123.3656;
    double altitudeM_ = 120.0;
    double targetAltitudeM_ = 120.0;
    double headingDeg_ = 180.0;
    double speedMps_ = 14.5;
    double batteryPercent_ = 100.0;
    double temperatureC_ = 34.0;

    int signalDbm_ = -54;

    std::string flightMode_ = "MISSION";
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

    try {
        FalconDrone drone(
            brokerUrl,
            droneId
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