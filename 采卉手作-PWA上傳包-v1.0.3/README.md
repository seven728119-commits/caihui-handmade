# 采卉手作 PWA｜v1.0.3

已包含最新版「采卉手作」拉鍊零錢包圖示、手機介面、課程管理、本機資料儲存及離線快取。純靜態檔案，不需要 npm、建置指令、登入或後端。

## 上傳 GitHub Pages

1. 將這個 ZIP 解壓縮。
2. 上傳解壓後的全部檔案與 assets 資料夾到 GitHub 儲存庫根目錄。index.html 必須直接位於根目錄，不要再包一層資料夾。不要只上傳 ZIP。
3. 儲存庫 Settings → Pages → Deploy from a branch → main → /(root) → Save。
4. 等待 GitHub Pages 提供網站網址，以該 HTTPS 網址開啟。

[GitHub Pages 官方設定說明](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## iPhone 加入主畫面

以 Safari 開啟 HTTPS 網址 → 分享 → 加入主畫面。第一次保持連線完成載入，設定頁顯示「離線資源已就緒」後，即可離線使用。已經安裝過的舊圖示可能受 iOS 快取影響，本次尚未在 iPhone 實機驗證。

## 資料保存

資料只存在目前裝置的瀏覽器，不會上傳 GitHub，不會跨裝置同步。網址更換前先在 App 設定「匯出備份」，到新網址再「匯入備份」。備份 JSON 不要放進 GitHub 儲存庫。

首次開啟含少量假學員示範；可於設定移除。上傳包沒有任何正式學員、付款或使用者照片。

更新時保留同一網站網址。這次 manifest 身份、scope、start_url 與 localStorage key 沒有改變。SW 版本是 caihui-craft-shell-v1.0.3；舊視窗全部關閉後再開啟，以啟用已下載的新版本。不要為更新圖示而清除網站資料。
