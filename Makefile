
all:
	npm run build NODE_ENV="production"
	scp -r dist/ root@101.132.35.92:~

setup:
	npm install @capacitor/core @capacitor/cli
