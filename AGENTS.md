# 项目工作约定

## 大版本私有备份

用户已授权：每完成一个大版本，都把完整项目备份到 GitHub 私有仓库 Starmiie/shenzhen-paper-flight-private。

- 在大版本实现并完成适当验证后，提交源码、必要城市资源、构建产物、运行说明和验证记录，再推送备份。
- 推送前验证目标仓库仍为私有；不得改成公开、开启公开部署或将代码推送到其他公开仓库。
- 保留既有来源署名与许可限制，不把私有备份视为公开发行授权。
- 排除 node_modules、本地凭证、令牌、.env、日志及浏览器个人记录。
- 推送后核对远端提交与本地版本一致，再向用户报告备份完成。
- 如登录或网络阻止备份，保留本地提交并明确告知尚未上传，不得声称备份完成。
- 此约定随大版本交付执行，不建立定时或后台监控任务。

## 原项目依据

上游城市的项目事实与坐标约定见 provenance/UPSTREAM_AGENTS.md；运行与许可说明见 README.md。

## 推送命令

在本项目仓库目录内，完成验证并提交当前大版本后执行：

```sh
if [ "$(gh repo view Starmiie/shenzhen-paper-flight-private --json isPrivate --jq .isPrivate)" = "true" ]; then
  git push origin main
else
  echo "未确认仓库为私有，已停止备份。" >&2
  exit 1
fi
```

不得强制推送；远端出现新提交时先检查差异并保留双方工作。
