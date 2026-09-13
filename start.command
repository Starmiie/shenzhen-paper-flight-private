#!/bin/zsh
cd "${0:A:h}/dist" || exit 1
printf '先抵达 · 本地预览\n请在浏览器打开 http://127.0.0.1:4173\n关闭此窗口或按 Ctrl+C 停止服务。\n'
python3 -m http.server 4173 --bind 127.0.0.1
