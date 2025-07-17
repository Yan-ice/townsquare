
all:
	npx cap copy
	npm run build NODE_ENV="production"
	scp -r dist/ ubuntu@111.229.112.80:~

setup:
	npm install @capacitor/core @capacitor/cli
	npx cap init
	npm run install
	npx cap add android

