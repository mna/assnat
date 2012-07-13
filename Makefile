.DEFAULT_GOAL = run
REPORTER = spec
TESTS = test/*.js
TEST_COVERAGE = test/coverage.html
GREP = .
BIZURL = http://www.assnat.qc.ca/fr/travaux-parlementaires/assemblee-nationale/39-2/journal-debats/20120426/56955.html

test:
	@TEST=1 $(shell . .env) ./node_modules/.bin/mocha --reporter $(REPORTER) --grep $(GREP) $(TESTS)

test-cov: lib-cov
	@COV=1 $(MAKE) -s test REPORTER=html-cov > $(TEST_COVERAGE) && chromium-browser $(TEST_COVERAGE)

lib-cov: lib
	@jscoverage --no-highlight lib lib-cov

run:
	@$(shell . .env) node run.js $(BIZURL)

lint:
	jshint run.js lib/

lint-test:
	jshint test/*.js

mongo: 
	@$(shell . .env) mongo $(MONGO_HOST):$(MONGO_PORT)/$(MONGO_DB) -u $(MONGO_USER) -p $(MONGO_PWD)

mongo-index: 
	@$(shell . .env) mongo $(MONGO_HOST):$(MONGO_PORT)/$(MONGO_DB) -u $(MONGO_USER) -p $(MONGO_PWD) ./db-create-indexes.js

clean:
	rm -f -r $(TEST_COVERAGE) lib-cov

.PHONY: test run clean lint lint-test
