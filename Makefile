
node_modules: package.json
	npm install
	touch $@

test: node_modules
	./node_modules/.bin/ava

lint: node_modules
	./node_modules/.bin/standard

.PHONY: test lint
