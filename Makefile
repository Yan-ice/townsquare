
all:
	npm run build NODE_ENV="production"
	scp -r dist/ ubuntu@111.229.112.80:~
