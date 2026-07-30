cmake_minimum_required(VERSION 3.20)

project(
    FalconDroneClient
    VERSION 1.0.0
    LANGUAGES CXX
)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

find_package(PahoMqttCpp REQUIRED)
find_package(nlohmann_json REQUIRED)

add_executable(
    falcon-drone
    src/drone.cpp
)

target_link_libraries(
    falcon-drone
    PRIVATE
        PahoMqttCpp::paho-mqttpp3
        nlohmann_json::nlohmann_json
        $<$<PLATFORM_ID:Windows>:ws2_32>
)

target_compile_definitions(
    falcon-drone
    PRIVATE
        _CRT_SECURE_NO_WARNINGS
        $<$<PLATFORM_ID:Windows>:PAHO_MQTTPP_IMPORTS>
)

if(MSVC)
    target_compile_options(
        falcon-drone
        PRIVATE
            /W4
    )
else()
    target_compile_options(
        falcon-drone
        PRIVATE
            -Wall
            -Wextra
            -pedantic
    )
endif()