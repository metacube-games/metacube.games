UWEBSOCKETS_PATH := /uWebSockets

override CXXFLAGS += -g -Wpedantic -Wall -Wextra -Wmissing-declarations -Wconversion
override CXXFLAGS += -Wunreachable-code -Wformat=2 -Winit-self -Wcast-align -Wwrite-strings
override CXXFLAGS += -Wuninitialized -Wfloat-equal -std=c++20 -Isrc/common
override CXXFLAGS += -isystem include -I$(UWEBSOCKETS_PATH)/src -I$(UWEBSOCKETS_PATH)/uSockets/src
GAME := -Isrc/world -Isrc/player -Isrc/message -Isrc/bomb
VIEW := -Isrc/message
override LDFLAGS += $(UWEBSOCKETS_PATH)/uSockets/*.o -lz -lredis++ -lhiredis -pthread

# WITH_PROXY enables PROXY Protocol v2 support
ifeq ($(WITH_PROXY),1)
	override CXXFLAGS += -DUWS_WITH_PROXY
endif

# WITH_QUIC enables experimental Http3 examples
ifeq ($(WITH_QUIC),1)
	override CXXFLAGS += -DLIBUS_USE_QUIC
	override LDFLAGS += -pthread -lz -lm $(UWEBSOCKETS_PATH)/uSockets/lsquic/src/liblsquic/liblsquic.a
endif

# WITH_LIBDEFLATE=1 enables fast paths for SHARED_COMPRESSOR and inflation
ifeq ($(WITH_LIBDEFLATE),1)
	override CXXFLAGS += -I libdeflate -DUWS_USE_LIBDEFLATE
	override LDFLAGS += libdeflate/libdeflate.a
endif

# Heavily prefer boringssl over openssl
ifeq ($(WITH_BORINGSSL),1)
	override CFLAGS += -I $(UWEBSOCKETS_PATH)/uSockets/boringssl/include -pthread -DLIBUS_USE_OPENSSL
	override LDFLAGS += -pthread $(UWEBSOCKETS_PATH)/uSockets/boringssl/build/libssl.a $(UWEBSOCKETS_PATH)/uSockets/boringssl/build/libcrypto.a
else
	# WITH_OPENSSL=1 enables OpenSSL 1.1+ support
	ifeq ($(WITH_OPENSSL),1)
		# With problems on macOS, make sure to pass needed LDFLAGS required to find these
		override LDFLAGS += -lssl -lcrypto
	else
		# WITH_WOLFSSL=1 enables WolfSSL 4.2.0 support (mutually exclusive with OpenSSL)
		ifeq ($(WITH_WOLFSSL),1)
			override LDFLAGS += -L/usr/local/lib -lwolfssl
		endif
	endif
endif

# WITH_LIBUV=1 builds with libuv as event-loop
ifeq ($(WITH_LIBUV),1)
	override LDFLAGS += -luv
endif

# WITH_ASIO=1 builds with ASIO as event-loop
ifeq ($(WITH_ASIO),1)
	override CXXFLAGS += -pthread
	override LDFLAGS += -lpthread
endif

# WITH_ASAN builds with sanitizers
ifeq ($(WITH_ASAN),1)
	override CXXFLAGS += -fsanitize=address -g
	override LDFLAGS += -lasan
endif

.SILENT: all clean

all:
	$(CXX) -flto=auto -O3 $(CXXFLAGS) $(GAME) game.cpp src/**/*.cpp -o game $(LDFLAGS); \
	$(CXX) -flto=auto -O3 $(CXXFLAGS) state.cpp -o state $(LDFLAGS); \
	$(CXX) -flto=auto -O3 $(CXXFLAGS) $(VIEW) view.cpp src/message/*.cpp -o view $(LDFLAGS); \

game:
	$(CXX) -flto=auto -O3 $(CXXFLAGS) $(GAME) game.cpp src/**/*.cpp -o game $(LDFLAGS); \

game-prod:
	$(CXX) -flto=auto -O3 $(CXXFLAGS) $(GAME) game.cpp src/**/*.cpp -o game $(LDFLAGS) -static; \

state:
	$(CXX) -flto=auto -O3 $(CXXFLAGS) state.cpp -o state $(LDFLAGS); \

state-prod:
	$(CXX) -flto=auto -O3 $(CXXFLAGS) state.cpp -o state $(LDFLAGS) -static; \

view:
	$(CXX) -flto=auto -O3 $(CXXFLAGS) $(VIEW) view.cpp src/message/*.cpp -o view $(LDFLAGS); \

view-prod:
	$(CXX) -flto=auto -O3 $(CXXFLAGS) $(VIEW) view.cpp src/message/*.cpp -o view $(LDFLAGS) -static; \

game-start:
	./game /env/.env

state-start:
	./state /env/.env

view-start:
	./view /env/.env

clean:
	rm -rf game state view
