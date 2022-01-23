clean:
	bash common/cleaner.sh

prepare-dependencies:
	cd styler-app && npm i && cd ..
	cd api-gateway && npm i && cd ..
	cd job-orchestrator && npm i && cd ..
	cd video-processing && pipenv install && cd ..

start-api:
	cd api-gateway && PORT=3500 npm start

start-app-dev:
	cd styler-app && PORT=3000 npm start

start-job-orchestrator:
	cd job-orchestrator && npm start

start-job-orchestrator-permanent:
	cd job-orchestrator && ./node_modules/forever/bin/forever start orchestrator.js
