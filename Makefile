CONTRACTS_PATH="./contracts"
RELAYER_DOCKER_FILE="./_assets/Dockerfile.relayer"
RELAYER_DOCKER_IMAGE="redeem-relayer"
RELAYER_DOCKER_CONTAINER_NAME="redeem-relayer"
RELAYER_CONTRACTS_PATH=$$(realpath ./scripts/contracts)
CONTAINER_KEYSTORES_PATH="/usr/keystores"

build-relayer-contracts:
	rm -rf $(RELAYER_CONTRACTS_PATH); \
	yarn run solcjs -o $(RELAYER_CONTRACTS_PATH) --bin --abi $$(find $(CONTRACTS_PATH) -name *.sol); \
	for fileName in $$(ls $(RELAYER_CONTRACTS_PATH)); do \
		newName=$${fileName##*_}; \
		mv $(RELAYER_CONTRACTS_PATH)/$${fileName} $(RELAYER_CONTRACTS_PATH)/$${newName}; \
	done;

check-relayer-env-variables:
ifndef ENDPOINT
	$(error ENDPOINT is undefined)
endif
ifndef KEYSTORES_PATH
	$(error KEYSTORES_PATH is undefined)
endif
ifndef RELAYER_BUCKET
	$(error RELAYER_BUCKET is undefined)
endif

run-relayer: check-relayer-env-variables
	node scripts/relay.js \
		--endpoint $(ENDPOINT) \
		--account=$(KEYSTORES_PATH)/keystore.json \
		--passfile=$(KEYSTORES_PATH)/keystore-passfile.txt \
		--bucket=$(RELAYER_BUCKET)

build-relayer-docker-image:
	docker build -t $(RELAYER_DOCKER_IMAGE) -f $(RELAYER_DOCKER_FILE) .

docker-run-relayer: check-relayer-env-variables
	docker run \
		-v $$(realpath $(KEYSTORES_PATH)):$(CONTAINER_KEYSTORES_PATH) \
		-e KEYSTORES_PATH=$(CONTAINER_KEYSTORES_PATH) \
		-e ENDPOINT=$(ENDPOINT) \
		-e RELAYER_BUCKET=$(RELAYER_BUCKET) \
		-e PORT=$(PORT) \
		--name $(RELAYER_DOCKER_CONTAINER_NAME) \
		--rm \
		-P \
		$(RELAYER_DOCKER_IMAGE) make run-relayer

docker-kill-relayer:
	docker kill $(RELAYER_DOCKER_CONTAINER_NAME)

docker-stop-relayer:
	docker stop $(RELAYER_DOCKER_CONTAINER_NAME)

deploy-erc20-factory:
	node scripts/create-redeemable.js \
		--endpoint $(ENDPOINT) \
		--account=$(ACCOUNT) \
		--passfile=$(PASSFILE) \
		--deploy-factory

deploy-erc20-bucket:
	node scripts/create-redeemable.js \
		--endpoint $(ENDPOINT) \
		--account=$(ACCOUNT) \
		--passfile=$(PASSFILE) \
		--deploy-bucket \
		--factory=$(ERC20_FACTORY) \
		--token=$(ERC20_TOKEN_ADDRESS) \
		--validity-in-days=$(ERC20_BUCKET_VALIDITY) \

