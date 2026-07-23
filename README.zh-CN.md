# 翻译排版 Zotero PDF 翻译插件

在 Zotero 中直接调用翻译排版文档翻译 API。插件会翻译完整 PDF、尽量保留原文结构，并将译文重新挂载到原文献条目下。

支持 Zotero 7 至 Zotero 9。

## 主要功能

- 翻译选中的本地 PDF，或者仅包含一个本地 PDF 的文献条目。
- 默认自动识别源语言并翻译成简体中文。
- 可在 Zotero 设置中修改默认目标语言。
- API Key 保存在 Zotero 本地凭据存储中，不写入普通同步偏好设置。
- 提交前显示可用 credits 和冻结 credits。
- credits 不足时显示所需、可用和缺口，并引导前往官网充值。
- 异步轮询翻译任务，Zotero 重启后可继续处理已成功提交的任务。
- 自动挂载译文 PDF，可选挂载对照 PDF 和 Markdown。
- 上传时直接读取磁盘文件，不把整个 PDF 一次性加载到 JavaScript 内存。

## 安装

1. 从 Releases 下载最新 `.xpi`。
2. 打开 Zotero 的 **工具 > 附加组件**。
3. 选择 **从文件安装附加组件**，安装 `.xpi`。
4. 打开 **设置 > 翻译排版 PDF 翻译**，配置 API Key。

API Key 创建、余额和充值入口：[翻译排版开发者中心](https://www.fanyipaiban.com/poly/developer-api?view=keys&source=zotero)。

## 使用

1. 在 Zotero 中选择本地 PDF 附件。
2. 右键点击 **使用翻译排版翻译 PDF**。
3. 确认目标语言和当前 credits 余额。
4. 提交阶段请保持 Zotero 运行；任务被服务端接受后，即使随后重启 Zotero，也可以继续轮询和下载。

插件默认下载译文 PDF。对照 PDF 和 Markdown 可以在设置中开启。

## 计费

插件与翻译排版工作台、对外 API 共用 credits 账户。计费页数和最终扣费以后端结果为准，不在插件中写死价格。服务端任务失败时沿用平台已有的 credits 释放和退款规则。

## 隐私

只有用户主动发起翻译时，插件才会向翻译排版 API 上传所选 PDF、文件名、目标语言和 API Key 鉴权信息。详见 [PRIVACY.md](PRIVACY.md)。

## 开发与发布

构建工具链要求 Node.js 22.8 或更高版本。

```bash
npm install
npm run verify
```

发布前请完成 [市场提交清单](docs/marketplace-submission.md) 和 [人工测试清单](docs/manual-test-checklist.md)。
