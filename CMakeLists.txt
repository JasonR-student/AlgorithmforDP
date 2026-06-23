cmake_minimum_required(VERSION 3.16)

project(LCS_SCS_Visualizer_Launcher LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_executable(LCS_SCS_Visualizer launcher/open_dist.cpp)

if (MSVC)
    target_compile_options(LCS_SCS_Visualizer PRIVATE /utf-8 /W4)
else()
    target_compile_options(LCS_SCS_Visualizer PRIVATE -Wall -Wextra -Wpedantic -finput-charset=UTF-8 -fexec-charset=UTF-8)
endif()

if (WIN32)
    target_link_libraries(LCS_SCS_Visualizer PRIVATE shell32)
endif()
