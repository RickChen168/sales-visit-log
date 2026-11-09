# 業務追蹤記錄

業務用 Google 帳號登入後，填寫當天出訪會議記錄，並查詢記錄清單。頁面部署在 GitHub Pages，資料寫進 Google 試算表「業務追蹤清單」。

```
GitHub Pages (index.html) ──Google 登入 ID token──▶ Apps Script (apps-script/Code.gs) ──▶ Google 試算表
```

## 權限

- 只有試算表「帳號」分頁裡列出的 Google 帳號可以登入。
- 身份別「睿思智慧」：可以查詢所有人的記錄。
- 身份別「經銷商」：只能查詢自己填的記錄。
- 業務姓名與身份別由「帳號」分頁決定，填寫時不能自己改。

## 設定步驟

1. **建立 OAuth 用戶端 ID**（Google Cloud Console → API 和服務 → 憑證）
   - 若是第一次使用，先設定「OAuth 同意畫面」：使用者類型選「外部」，發布狀態設為「正式版」。
   - 建立憑證 → OAuth 用戶端 ID → 類型「網頁應用程式」
   - 已授權的 JavaScript 來源：`https://rickchen168.github.io`
   - 複製用戶端 ID（結尾是 `.apps.googleusercontent.com`）。
2. 把用戶端 ID 填進 `apps-script/Code.gs` 的 `CLIENT_ID`，以及 `index.html` 的 `GOOGLE_CLIENT_ID`。
3. 打開試算表「業務追蹤清單」→ 擴充功能 → Apps Script，整段貼上 `Code.gs` 並儲存。
4. 在函式下拉選單選 `setup` 按「執行」一次，完成授權並建立「帳號」分頁。
5. 部署 → 管理部署作業 → 鉛筆 → 版本選「新版本」→ 部署（網址不變）。
6. 在「帳號」分頁填入每位業務的 Email、姓名、身份別（睿思智慧／經銷商）。

## 注意

- 舊記錄沒有「帳號」欄，經銷商的舊記錄用「姓名」比對，請讓「帳號」分頁的姓名和舊記錄的業務姓名一致。
- 修改 `Code.gs` 後要用「管理部署作業」部署新版本，網址才會保持不變。
