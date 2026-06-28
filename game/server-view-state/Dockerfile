FROM gcc:15

ENV WITH_BORINGSSL=1

RUN apt-get update && apt-get install -y cmake && rm -rf /var/lib/apt/lists/*

RUN git clone --branch v20.77.0 https://github.com/uNetworking/uWebSockets.git /uWebSockets

RUN cd /uWebSockets && git submodule update --init --recursive

RUN cmake -S /uWebSockets/uSockets/boringssl -B /uWebSockets/uSockets/boringssl/build \
    -DCMAKE_CXX_FLAGS="-Wno-error=ignored-attributes" && \
    cmake --build /uWebSockets/uSockets/boringssl/build --target ssl crypto --parallel

RUN make -C /uWebSockets/uSockets

RUN find /uWebSockets -mindepth 1 -maxdepth 1 ! -name 'src' ! -name 'uSockets' -exec rm -rf {} +

RUN find /uWebSockets/uSockets -mindepth 1 -maxdepth 1 ! -name 'src' ! -name '*.o' ! -name 'boringssl' -exec rm -rf {} +

RUN find /uWebSockets/uSockets/boringssl -mindepth 1 -maxdepth 1 ! -name 'build' ! -name 'include' -exec rm -rf {} +

RUN git clone --branch v1.3.0 https://github.com/redis/hiredis.git && \
    cmake -S hiredis -B hiredis/build -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF && \
    cmake --build hiredis/build --parallel && \
    cmake --install hiredis/build

RUN git clone --branch 1.3.15 https://github.com/sewenew/redis-plus-plus.git && \
    cmake -S redis-plus-plus -B redis-plus-plus/build -DCMAKE_BUILD_TYPE=Release -DREDIS_PLUS_PLUS_BUILD_SHARED=OFF && \
    cmake --build redis-plus-plus/build --parallel && \
    cmake --install redis-plus-plus/build

RUN rm -rf hiredis redis-plus-plus

RUN ldconfig
