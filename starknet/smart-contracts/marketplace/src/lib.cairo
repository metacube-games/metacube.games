// SPDX-License-Identifier: MIT
use starknet::ContractAddress;

#[derive(Drop, Serde, starknet::Store)]
struct OrderStatus {
    order_creator: ContractAddress,
    payment_token_amount: u256,
    payment_token_address: ContractAddress,
    expiration_timestamp: u64,
}

#[starknet::interface]
trait IMetacubeMarket<TContractState> {
    fn list_order(
        ref self: TContractState,
        collection_address: ContractAddress,
        token_id: u256,
        payment_token_amount: u256,
        payment_token_address: ContractAddress,
        expiration_timestamp: u64,
    );
    fn delist_order(ref self: TContractState, collection_address: ContractAddress, token_id: u256);
    fn buy(ref self: TContractState, collection_address: ContractAddress, token_id: u256);
    fn get_order_status(
        self: @TContractState, collection_address: ContractAddress, token_id: u256,
    ) -> OrderStatus;
}

#[starknet::contract]
mod MetacubeMarket {
    use openzeppelin::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
    use openzeppelin::token::erc721::interface::{IERC721Dispatcher, IERC721DispatcherTrait};
    use starknet::event::EventEmitter;
    use starknet::storage::{
        Map, StoragePathEntry, StoragePointerReadAccess, StoragePointerWriteAccess,
    };
    use starknet::{ContractAddress, get_block_timestamp, get_caller_address};
    use super::OrderStatus;

    #[storage]
    struct Storage {
        // Mapping from contract address to token id to OrderStatus
        listings: Map<ContractAddress, Map<u256, OrderStatus>> //address -> [u256->OrderStatus]
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        ListOrder: ListOrder,
        DelistOrder: DelistOrder,
        Buy: Buy,
    }

    #[derive(Drop, starknet::Event)]
    pub struct ListOrder {
        #[key]
        pub collection_address: ContractAddress,
        #[key]
        pub token_id: u256,
        pub payment_token_amount: u256,
        pub payment_token_address: ContractAddress,
        pub expiration_timestamp: u64,
        pub order_creator: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct DelistOrder {
        #[key]
        pub collection_address: ContractAddress,
        #[key]
        pub token_id: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct Buy {
        #[key]
        pub collection_address: ContractAddress,
        #[key]
        pub token_id: u256,
        pub payment_token_amount: u256,
        pub payment_token_address: ContractAddress,
        pub seller: ContractAddress,
        pub buyer: ContractAddress,
    }

    #[constructor]
    // this is a constructor function
    fn constructor(ref self: ContractState) {}

    //private functions
    #[generate_trait]
    impl InternalFunctions of InternalFunctionsTrait {
        //delist_unsafe is a private function that delists an order without any checks
        fn _delist_unsafe(
            ref self: ContractState, collection_address: ContractAddress, token_id: u256,
        ) {
            self.listings.entry(collection_address).entry(token_id).expiration_timestamp.write(0);

            self.emit(DelistOrder { collection_address, token_id });
        }
    }

    //public functions
    #[abi(embed_v0)]
    impl MetacubeMarket of super::IMetacubeMarket<ContractState> {
        fn list_order(
            ref self: ContractState,
            collection_address: ContractAddress,
            token_id: u256,
            payment_token_amount: u256,
            payment_token_address: ContractAddress,
            expiration_timestamp: u64,
        ) {
            let erc721_dispatcher = IERC721Dispatcher { contract_address: collection_address };
            assert(
                get_caller_address() == erc721_dispatcher.owner_of(token_id), 'not owner of token',
            );

            let order_creator = get_caller_address();
            let order_status = OrderStatus {
                order_creator, payment_token_amount, payment_token_address, expiration_timestamp,
            };
            self.listings.entry(collection_address).entry(token_id).write(order_status);

            self
                .emit(
                    ListOrder {
                        collection_address,
                        token_id,
                        payment_token_amount,
                        payment_token_address,
                        expiration_timestamp,
                        order_creator,
                    },
                );
        }

        fn delist_order(
            ref self: ContractState, collection_address: ContractAddress, token_id: u256,
        ) {
            let erc721_dispatcher = IERC721Dispatcher { contract_address: collection_address };
            //make sure the caller is the owner of the NFT
            assert(
                get_caller_address() == erc721_dispatcher.owner_of(token_id), 'not owner of token',
            );

            self._delist_unsafe(collection_address, token_id);
        }

        fn buy(ref self: ContractState, collection_address: ContractAddress, token_id: u256) {
            let order_status = self.get_order_status(collection_address, token_id);

            // check order is not expired (or delisted which is just expiration_timestamp == 0)
            assert(get_block_timestamp() < order_status.expiration_timestamp, 'token not for sale');

            let caller = get_caller_address();

            //delist token
            self._delist_unsafe(collection_address, token_id);

            // prepare the token dispatchers
            let erc20_dispatcher = IERC20Dispatcher {
                contract_address: order_status.payment_token_address,
            }; //test if nothing happens when trying to send a token that is not an ERC20
            let erc721_dispatcher = IERC721Dispatcher { contract_address: collection_address };

            //send payment from the buyer to the order creator
            erc20_dispatcher
                .transfer_from(
                    caller, order_status.order_creator, order_status.payment_token_amount,
                );

            //send NFT from the order creator to the buyer
            erc721_dispatcher
                .safe_transfer_from(
                    order_status.order_creator,
                    caller,
                    token_id,
                    array![].span() //empty data array as this field is not necessary for us
                );

            self
                .emit(
                    Buy {
                        collection_address,
                        token_id,
                        payment_token_amount: order_status.payment_token_amount,
                        payment_token_address: order_status.payment_token_address,
                        seller: order_status.order_creator,
                        buyer: caller,
                    },
                );
        }

        fn get_order_status(
            self: @ContractState, collection_address: ContractAddress, token_id: u256,
        ) -> OrderStatus {
            let order_status = self.listings.entry(collection_address).entry(token_id).read();

            order_status
        }
    }
}
