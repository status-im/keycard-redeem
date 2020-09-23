-include .env

RELAYER_DOCKER_FILE="./_assets/Dockerfile.relayer"
RELAYER_DOCKER_IMAGE="redeem-relayer"
RELAYER_DOCKER_CONTAINER_NAME="redeem-relayer"
CONTAINER_KEYSTORES_PATH="/usr/keystores"

compile-contracts:
	truffle compile

deploy-contracts: compile-contracts
	truffle deploy

check-relayer-env-variables:
ifndef ENDPOINT
	$(error ENDPOINT is undefined)
endif
ifndef KEYSTORES_PATH
	$(error KEYSTORES_PATH is undefined)
endif
ifndef BUCKET
	$(error BUCKET is undefined)
endif

run-relayer: check-relayer-env-variables
	env PORT=$(PORT) node scripts/relay.js \
		--endpoint=$(ENDPOINT) \
		--account=$(KEYSTORES_PATH)/keystore.json \
		--passfile=$(KEYSTORES_PATH)/keystore-passfile.txt \
		--bucket=$(BUCKET)

build-relayer-docker-image:
	docker build -t $(RELAYER_DOCKER_IMAGE) -f $(RELAYER_DOCKER_FILE) .

docker-run-relayer: check-relayer-env-variables
	docker run \
		-d \
		-v $$(realpath $(KEYSTORES_PATH)):$(CONTAINER_KEYSTORES_PATH) \
		-e KEYSTORES_PATH=$(CONTAINER_KEYSTORES_PATH) \
		-e ENDPOINT=$(ENDPOINT) \
		-e BUCKET=$(BUCKET) \
		-e PORT=$(PORT) \
		--name $(RELAYER_DOCKER_CONTAINER_NAME) \
		--rm \
		-p $(PORT):$(PORT) \
		$(RELAYER_DOCKER_IMAGE) make run-relayer

docker-kill-relayer:
	docker kill $(RELAYER_DOCKER_CONTAINER_NAME)

docker-stop-relayer:
	docker stop $(RELAYER_DOCKER_CONTAINER_NAME)

deploy-erc20-factory:
	node scripts/create-redeemable.js \
		--endpoint=$(ENDPOINT) \
		--account=$(ACCOUNT) \
		--passfile=$(PASSFILE) \
		--deploy-factory

deploy-erc20-bucket:
	node scripts/create-redeemable.js \
		--endpoint=$(ENDPOINT) \
		--account=$(ACCOUNT) \
		--passfile=$(PASSFILE) \
		--deploy-bucket \
		--factory=$(ERC20_FACTORY) \
		--token=$(ERC20_TOKEN_ADDRESS) \
		--validity-in-days=$(ERC20_BUCKET_VALIDITY) \
		--relayer-uri="$(RELAYER_URI)"

create-erc20-redeemables:
	node scripts/create-redeemable.js \
		--endpoint=$(ENDPOINT) \
		--account=$(ACCOUNT) \
		--passfile=$(PASSFILE) \
		--file=$(ERC20_BUCKET_FILE) \
		--bucket=$(BUCKET)
