// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts for Cairo ^0.20.0

#[starknet::contract]
mod Imageos {
    use starknet::event::EventEmitter;
    use starknet::storage::StoragePointerReadAccess;
    use starknet::storage::StoragePointerWriteAccess;
    use starknet::storage::{StoragePathEntry, Map};
    use core::num::traits::Zero;
    use openzeppelin::access::ownable::OwnableComponent;
    use openzeppelin::introspection::src5::SRC5Component;
    use openzeppelin::token::common::erc2981::{DefaultConfig, ERC2981Component};
    use openzeppelin::token::erc721::ERC721Component;
    use openzeppelin::token::erc721::extensions::ERC721EnumerableComponent;
    use openzeppelin::upgrades::interface::IUpgradeable;
    use openzeppelin::upgrades::UpgradeableComponent;
    use openzeppelin::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
    use openzeppelin::token::erc721::interface::{IERC721Dispatcher, IERC721DispatcherTrait};
    use starknet::{ClassHash, ContractAddress, get_caller_address};

    component!(path: ERC721Component, storage: erc721, event: ERC721Event);
    component!(path: SRC5Component, storage: src5, event: SRC5Event);
    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);
    component!(
        path: ERC721EnumerableComponent, storage: erc721_enumerable, event: ERC721EnumerableEvent,
    );
    component!(path: UpgradeableComponent, storage: upgradeable, event: UpgradeableEvent);
    component!(path: ERC2981Component, storage: erc2981, event: ERC2981Event);

    // External
    #[abi(embed_v0)]
    impl ERC721MixinImpl = ERC721Component::ERC721MixinImpl<ContractState>;
    #[abi(embed_v0)]
    impl OwnableMixinImpl = OwnableComponent::OwnableMixinImpl<ContractState>;
    #[abi(embed_v0)]
    impl ERC721EnumerableImpl =
        ERC721EnumerableComponent::ERC721EnumerableImpl<ContractState>;
    #[abi(embed_v0)]
    impl ERC2981Impl = ERC2981Component::ERC2981Impl<ContractState>;
    #[abi(embed_v0)]
    impl ERC2981InfoImpl = ERC2981Component::ERC2981InfoImpl<ContractState>;
    #[abi(embed_v0)]
    impl ERC2981AdminOwnableImpl =
        ERC2981Component::ERC2981AdminOwnableImpl<ContractState>;

    // Internal
    impl ERC721InternalImpl = ERC721Component::InternalImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;
    impl ERC721EnumerableInternalImpl = ERC721EnumerableComponent::InternalImpl<ContractState>;
    impl UpgradeableInternalImpl = UpgradeableComponent::InternalImpl<ContractState>;
    impl ERC2981InternalImpl = ERC2981Component::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        // ? we know those 3 can be much smaller than u256, take the adapted one, but what if we
        // ? want to use this as a gneeric contract ?
        sold_number: u256,
        price: u256,
        max_sell_number: u256,
        enable_claim: bool,
        payment_token_address: ContractAddress,
        claimer_token_address: ContractAddress,
        claimed: Map<u256, bool>,
        #[substorage(v0)]
        erc721: ERC721Component::Storage,
        #[substorage(v0)]
        src5: SRC5Component::Storage,
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
        #[substorage(v0)]
        erc721_enumerable: ERC721EnumerableComponent::Storage,
        #[substorage(v0)]
        upgradeable: UpgradeableComponent::Storage,
        #[substorage(v0)]
        erc2981: ERC2981Component::Storage,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        ERC721Event: ERC721Component::Event,
        #[flat]
        SRC5Event: SRC5Component::Event,
        #[flat]
        OwnableEvent: OwnableComponent::Event,
        #[flat]
        ERC721EnumerableEvent: ERC721EnumerableComponent::Event,
        #[flat]
        UpgradeableEvent: UpgradeableComponent::Event,
        #[flat]
        ERC2981Event: ERC2981Component::Event,
        Buy: Buy,
        Claim: Claim,
        UpdateClaimStatus: UpdateClaimStatus,
        UpdateMaxSell: UpdateMaxSell,
        UpdatePriceAndToken: UpdatePriceAndToken,
    }

    // ? is it possible to make only one event instead of two (right now we have Buy and Transfer
    // ? or Claim and Transfer, Transfer being in ERC721Event). Would flattent work out to do that ?
    #[derive(Drop, starknet::Event)]
    pub struct Buy {
        pub id: u256,
        #[key]
        pub minter: core::starknet::contract_address::ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct Claim {
        pub id: u256,
        #[key]
        pub minter: core::starknet::contract_address::ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct UpdateClaimStatus {
        pub new_status: bool,
    }

    #[derive(Drop, starknet::Event)]
    pub struct UpdateMaxSell {
        pub max_sell_number: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct UpdatePriceAndToken {
        pub price: u256,
        pub token_address: ContractAddress,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        owner: ContractAddress,
        claimer_nft_address: ContractAddress,
        name: ByteArray,
        symbol: ByteArray,
        base_uri: ByteArray,
    ) {
        self
            .erc721
            .initializer(
                name, symbol, base_uri,
            ); //for the base uri :"https://felts.xyz/p/metadata/"
        self.ownable.initializer(owner);
        self.claimer_token_address.write(claimer_nft_address);
        self.erc721_enumerable.initializer();
        self
            .erc2981
            .initializer(owner, 500); // makes owner the royalty receiver and sets the royalty to 5%
    }

    impl ERC721HooksImpl of ERC721Component::ERC721HooksTrait<ContractState> {
        fn before_update(
            ref self: ERC721Component::ComponentState<ContractState>,
            to: ContractAddress,
            token_id: u256,
            auth: ContractAddress,
        ) {
            let mut contract_state = self.get_contract_mut();
            contract_state.erc721_enumerable.before_update(to, token_id);
        }
    }

    #[generate_trait]
    #[abi(per_item)]
    impl ExternalImpl of ExternalTrait {
        #[external(v0)]
        fn burn(ref self: ContractState, token_id: u256) {
            self.erc721.update(Zero::zero(), token_id, get_caller_address());
        }

        #[external(v0)]
        fn safe_mint(
            ref self: ContractState,
            recipient: ContractAddress,
            token_id: u256,
            data: Span<felt252>,
        ) {
            self.ownable.assert_only_owner();
            self.erc721.safe_mint(recipient, token_id, data);
        }

        #[external(v0)]
        fn safeMint(
            ref self: ContractState, recipient: ContractAddress, tokenId: u256, data: Span<felt252>,
        ) {
            self.safe_mint(recipient, tokenId, data);
        }

        #[external(v0)]
        fn update_claim_status(ref self: ContractState, new_status: bool) {
            self.ownable.assert_only_owner();
            self.enable_claim.write(new_status);
            self.emit(UpdateClaimStatus { new_status });
        }

        #[external(v0)]
        fn update_max_sell(ref self: ContractState, max_sell_number: u256) {
            self.ownable.assert_only_owner();
            assert(self.price.read() > 0, 'update_price_and_token first');

            self.max_sell_number.write(max_sell_number);
            self.emit(UpdateMaxSell { max_sell_number });
        }

        #[external(v0)]
        fn update_price_and_token(
            ref self: ContractState, price: u256, token_address: ContractAddress,
        ) {
            self.ownable.assert_only_owner();
            assert(price > 0, 'Price must be greater than 0');

            self.price.write(price);
            self.payment_token_address.write(token_address);
            self.emit(UpdatePriceAndToken { price, token_address });
        }

        #[external(v0)]
        fn buy(ref self: ContractState) {
            let sold_number = self.sold_number.read();

            assert(sold_number < self.max_sell_number.read(), 'Sold out');
            let erc20_dispatcher = IERC20Dispatcher {
                contract_address: self.payment_token_address.read(),
            };
            let minter = get_caller_address();
            let id = self.erc721_enumerable.total_supply();

            erc20_dispatcher.transfer_from(minter, self.owner(), self.price.read());
            self.erc721.safe_mint(minter, id, array![].span());
            self.sold_number.write(sold_number + 1);

            self.emit(Buy { id, minter });
        }

        #[external(v0)]
        fn claim(ref self: ContractState, token_id: u256) {
            assert(
                !self.claimed.entry(token_id).read(), 'Already claimed',
            ); // checks this claimer_nft has not already been used to claim the reward NFT
            let claiming_nft = IERC721Dispatcher {
                contract_address: self.claimer_token_address.read(),
            };
            let nft_owner = claiming_nft.owner_of(token_id);

            let minter = get_caller_address();
            assert(nft_owner == minter, 'Not the owner of the NFT');

            let id = self.erc721_enumerable.total_supply();

            self.erc721.safe_mint(minter, id, array![].span());
            self.claimed.entry(token_id).write(true); // register claim for this passcard

            self.emit(Claim { id, minter });
        }

        // takes in an array of token ids and returns an array of booleans
        #[external(v0)]
        fn get_claimed(self: @ContractState, token_ids: Span<u256>) -> Span<bool> {
            let mut result: Array<bool> = array![];
            let mut i = 0;
            while i != token_ids.len() {
                result.append(self.claimed.entry(*token_ids[i]).read());
                i += 1;
            };
            result.span()
        }

        #[external(v0)]
        fn get_claimer_token_address(self: @ContractState) -> ContractAddress {
            self.claimer_token_address.read()
        }

        #[external(v0)]
        fn get_max_sell_number(self: @ContractState) -> u256 {
            self.max_sell_number.read()
        }

        #[external(v0)]
        fn get_price(self: @ContractState) -> u256 {
            self.price.read()
        }

        #[external(v0)]
        fn get_sold_number(self: @ContractState) -> u256 {
            self.sold_number.read()
        }

        #[external(v0)]
        fn get_claim_status(self: @ContractState) -> bool {
            self.enable_claim.read()
        }

        #[external(v0)]
        fn get_payment_token_address(self: @ContractState) -> ContractAddress {
            self.payment_token_address.read()
        }
    }

    //
    // Upgradeable
    //

    #[abi(embed_v0)]
    impl UpgradeableImpl of IUpgradeable<ContractState> {
        fn upgrade(ref self: ContractState, new_class_hash: ClassHash) {
            self.ownable.assert_only_owner();
            self.upgradeable.upgrade(new_class_hash);
        }
    }
}
