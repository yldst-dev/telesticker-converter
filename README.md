<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies: `npm install`
2. Run the app: `npm run dev`

## Deploy (GitHub Pages + 커스텀 도메인)

1. `public/CNAME` 파일의 `example.com`을 사용할 도메인으로 바꿉니다.
2. GitHub repo의 Pages를 활성화하고 브랜치를 `main`, 폴더를 `GitHub Actions`로 설정합니다.
3. 워크플로 `.github/workflows/deploy.yml`가 push 시 자동으로 빌드/배포합니다.
4. 도메인의 DNS에 `CNAME` 레코드를 `username.github.io`로 설정하면 커스텀 도메인으로 접속할 수 있습니다.
