FROM ubuntu:24.04 AS build

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        ca-certificates \
        cmake \
        git \
        libssl-dev \
        nlohmann-json3-dev \
        pkg-config \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /deps

RUN git clone --depth 1 --branch v1.3.16 \
        https://github.com/eclipse-paho/paho.mqtt.c.git \
    && cmake -S paho.mqtt.c -B paho.mqtt.c/build \
        -DCMAKE_BUILD_TYPE=Release \
        -DPAHO_WITH_SSL=ON \
        -DPAHO_BUILD_SHARED=ON \
        -DPAHO_BUILD_STATIC=OFF \
        -DPAHO_ENABLE_TESTING=OFF \
        -DPAHO_BUILD_SAMPLES=OFF \
    && cmake --build paho.mqtt.c/build --parallel \
    && cmake --install paho.mqtt.c/build

RUN git clone --depth 1 --branch v1.6.0 \
        https://github.com/eclipse-paho/paho.mqtt.cpp.git \
    && cmake -S paho.mqtt.cpp -B paho.mqtt.cpp/build \
        -DCMAKE_BUILD_TYPE=Release \
        -DPAHO_WITH_SSL=ON \
        -DPAHO_WITH_MQTT_C=OFF \
        -DPAHO_BUILD_SHARED=ON \
        -DPAHO_BUILD_STATIC=OFF \
        -DPAHO_BUILD_SAMPLES=OFF \
        -DPAHO_BUILD_TESTS=OFF \
        -DCMAKE_PREFIX_PATH=/usr/local \
    && cmake --build paho.mqtt.cpp/build --parallel \
    && cmake --install paho.mqtt.cpp/build

WORKDIR /app

COPY CMakeLists.txt .
COPY src ./src

RUN cmake -S . -B build \
        -DCMAKE_BUILD_TYPE=Release \
        -DCMAKE_PREFIX_PATH=/usr/local \
    && cmake --build build --parallel

FROM ubuntu:24.04 AS runtime

ENV DEBIAN_FRONTEND=noninteractive
ENV LD_LIBRARY_PATH=/usr/local/lib

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        libssl3 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /usr/local/lib/ /usr/local/lib/
COPY --from=build /app/build/falcon-drone /usr/local/bin/falcon-drone

RUN ldconfig

ENTRYPOINT ["/usr/local/bin/falcon-drone"]