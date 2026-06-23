#include <filesystem>
#include <iostream>
#include <string>

#ifdef _WIN32
#include <shellapi.h>
#include <windows.h>
#endif

int main() {
    const auto html = std::filesystem::current_path() / "dist" / "index.html";
    if (!std::filesystem::exists(html)) {
        std::cerr << "dist/index.html not found. Run npm run build first.\n";
        return 1;
    }

#ifdef _WIN32
    ShellExecuteW(nullptr, L"open", html.wstring().c_str(), nullptr, nullptr, SW_SHOWNORMAL);
#else
    std::cout << html.string() << "\n";
#endif
    return 0;
}
