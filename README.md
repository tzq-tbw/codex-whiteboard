# 白板

一个纯静态的图片白板。点击“白板”或“导入图片”选择 PNG/JPG，也支持拖入文件、粘贴截图。侧栏管理多张图片，各页批注互相独立。

支持红蓝笔、三档笔宽、直线、整笔擦除、撤销/重做，以及以光标为中心缩放和恢复适应窗口。窄窗口下工具自动换行。

图片与批注仅保存在当前页面内存中，不上传到服务器；刷新或关闭后丢失。没有后台或数据库。网页画笔与浏览器自己的 Annotate 是两种独立功能，后者需要在目标浏览器中验证。

直接打开 index.html 可本地使用。GitHub Pages 从 main 分支根目录发布，无需构建。

笔迹轮廓使用内联 perfect-freehand v1.2.3（MIT），许可见 THIRD_PARTY_LICENSES.txt。

开发回归检查：Node.js 环境中安装 playwright-core，并用 `npx playwright-core install chromium` 安装测试浏览器后，运行 `node tests/check.cjs 800`。也可传入 480、1000 检查不同宽度。测试工具不属于网页运行依赖。
