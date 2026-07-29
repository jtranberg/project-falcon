cmake_minimum_required(VERSION 3.20)

project(
    FalconDroneClient
    VERSION 1.0.0
    LANGUAGES CXX
)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

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
)

target_compile_definitions(
    falcon-drone
    PRIVATE
        _CRT_SECURE_NO_WARNINGS
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