# 業務出訪記錄

業務填寫當天出訪會議記錄的表單頁面，部署在 GitHub Pages。送出的資料會寫進一份 Google 試算表，追蹤清單就在試算表裡看。

```
GitHub Pages 表單 (index.html) ──POST──▶ Google Apps Script (apps-script/Code.gs) ──▶ Google 試算表
```

## 設定步驟

1. 打開 Google 試算表「業務出訪記錄 追蹤清單」→ 擴充功能 → Apps Script。
2. 把 `apps-script/Code.gs` 的內容整段貼上，取代原本的程式碼，然後儲存。
3. 部署 → 新增部署作業 → 類型選「網頁應用程式」：
   - 執行身分：**我**
   - 誰可以存取：**所有人**
4. 授權後，複製「網頁應用程式網址」（結尾是 `/exec`）。
5. 把網址貼到 `index.html` 裡的 `const SCRIPT_URL = "";`，然後 commit。

## 注意

- 表單網址是公開的，任何拿到連結的人都能送出資料。追蹤清單只存在試算表裡，誰能看由試算表的共用設定決定。
- 之後如果修改了 `Code.gs`，要用「管理部署作業」→ 編輯 → 版本選「新版本」，網址才會保持不變。
