use starknet::ContractAddress;
// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts for Cairo ^1.0.0

#[starknet::interface]
trait IClaimContract<TContractState> {
    fn burn(ref self: TContractState, token_id: u256);
    fn safe_mint(ref self: TContractState, recipient: ContractAddress);
    fn safeMint(ref self: TContractState, recipient: ContractAddress);
    fn update_sale_limit(ref self: TContractState, sale_limit: u256);
    fn update_price_and_token(
        ref self: TContractState, price: u256, token_address: ContractAddress,
    );
    fn buy(ref self: TContractState);
    fn claim(ref self: TContractState, claimer_token_id: u256);
    fn get_claimed(self: @TContractState, claimer_token_ids: Span<u256>) -> Span<bool>;
    fn get_claimer_token_address(self: @TContractState) -> ContractAddress;
    fn get_sale_limit(self: @TContractState) -> u256;
    fn get_price(self: @TContractState) -> u256;
    fn get_sold_count(self: @TContractState) -> u256;
    fn get_payment_token_address(self: @TContractState) -> ContractAddress;
}

#[starknet::contract]
mod ClaimContract {
    use core::num::traits::Zero;
    use openzeppelin::access::ownable::OwnableComponent;
    use openzeppelin::introspection::src5::SRC5Component;
    use openzeppelin::token::common::erc2981::{DefaultConfig, ERC2981Component};
    use openzeppelin::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
    use openzeppelin::token::erc721::ERC721Component;
    use openzeppelin::token::erc721::extensions::ERC721EnumerableComponent;
    use openzeppelin::token::erc721::interface::{IERC721Dispatcher, IERC721DispatcherTrait};
    use openzeppelin::upgrades::UpgradeableComponent;
    use openzeppelin::upgrades::interface::IUpgradeable;
    use starknet::event::EventEmitter;
    use starknet::storage::{
        Map, StoragePathEntry, StoragePointerReadAccess, StoragePointerWriteAccess,
    };
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

    //==========================================================================
    // STORAGE
    //==========================================================================

    #[storage]
    struct Storage {
        // Claim
        claimer_token_address: ContractAddress,
        claimed: Map<u256, bool>,
        // Sale
        payment_token_address: ContractAddress,
        sold_count: u256,
        price: u256,
        sale_limit: u256,
        // Substorage
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

    //==========================================================================
    // EVENTS
    //==========================================================================

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        Buy: Buy,
        Claim: Claim,
        UpdateClaimStatus: UpdateClaimStatus,
        UpdateSaleLimit: UpdateSaleLimit,
        UpdatePriceAndToken: UpdatePriceAndToken,
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
    }

    #[derive(Drop, starknet::Event)]
    pub struct Buy {
        pub token_id: u256,
        #[key]
        pub minter: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct Claim {
        pub claimer_token_id: u256,
        pub token_id: u256,
        #[key]
        pub minter: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct UpdateClaimStatus {
        pub new_status: bool,
    }

    #[derive(Drop, starknet::Event)]
    pub struct UpdateSaleLimit {
        pub sale_limit: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct UpdatePriceAndToken {
        pub price: u256,
        pub token_address: ContractAddress,
    }

    //==========================================================================
    // CONSTRUCTOR
    //==========================================================================

    #[constructor]
    fn constructor(
        ref self: ContractState,
        claimer_token_address: ContractAddress,
        name: ByteArray,
        symbol: ByteArray,
        base_uri: ByteArray,
        owner: ContractAddress,
        royalty: u128,
    ) {
        self.claimer_token_address.write(claimer_token_address);

        self.erc721.initializer(name, symbol, base_uri);
        self.ownable.initializer(owner);
        self.erc721_enumerable.initializer();
        self.erc2981.initializer(owner, royalty);
    }

    //==========================================================================
    // TRAITS IMPLEMENTATION
    //==========================================================================

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

    #[abi(embed_v0)]
    impl UpgradeableImpl of IUpgradeable<ContractState> {
        fn upgrade(ref self: ContractState, new_class_hash: ClassHash) {
            self.ownable.assert_only_owner();
            self.upgradeable.upgrade(new_class_hash);
        }
    }

    #[abi(embed_v0)]
    impl ClaimContract of super::IClaimContract<ContractState> {
        //======================================================================
        // WRITE FUNCTIONS
        //======================================================================

        fn burn(ref self: ContractState, token_id: u256) {
            self.erc721.update(Zero::zero(), token_id, get_caller_address());
        }

        fn safe_mint(ref self: ContractState, recipient: ContractAddress) {
            self.ownable.assert_only_owner();

            let token_id = self.erc721_enumerable.total_supply();

            self.erc721.safe_mint(recipient, token_id, array![].span());
        }

        fn safeMint(ref self: ContractState, recipient: ContractAddress) {
            self.safe_mint(recipient);
        }

        fn update_sale_limit(ref self: ContractState, sale_limit: u256) {
            self.ownable.assert_only_owner();
            assert(self.price.read() > 0, 'update_price_and_token first');

            self.sale_limit.write(sale_limit);

            self.emit(UpdateSaleLimit { sale_limit });
        }

        fn update_price_and_token(
            ref self: ContractState, price: u256, token_address: ContractAddress,
        ) {
            self.ownable.assert_only_owner();
            assert(price > 0, 'Price must be greater than 0');

            self.price.write(price);
            self.payment_token_address.write(token_address);

            self.emit(UpdatePriceAndToken { price, token_address });
        }

        fn buy(ref self: ContractState) {
            let sold_count = self.sold_count.read();
            assert(sold_count < self.sale_limit.read(), 'Sold out');

            let erc20_dispatcher = IERC20Dispatcher {
                contract_address: self.payment_token_address.read(),
            };
            let minter = get_caller_address();
            erc20_dispatcher.transfer_from(minter, self.owner(), self.price.read());

            let token_id = self.erc721_enumerable.total_supply();
            self.erc721.safe_mint(minter, token_id, array![].span());
            self.sold_count.write(sold_count + 1);

            self.emit(Buy { token_id, minter });
        }

        fn claim(ref self: ContractState, claimer_token_id: u256) {
            assert(!self.claimed.entry(claimer_token_id).read(), 'Already claimed');

            let claimer_contract = IERC721Dispatcher {
                contract_address: self.claimer_token_address.read(),
            };
            let token_owner = claimer_contract.owner_of(claimer_token_id);

            let minter = get_caller_address();
            assert(token_owner == minter, 'Not the owner of the token');

            let token_id = self.erc721_enumerable.total_supply();

            self.erc721.safe_mint(minter, token_id, array![].span());
            self.claimed.entry(claimer_token_id).write(true);

            self.emit(Claim { claimer_token_id, token_id, minter });
        }

        //======================================================================
        // READ FUNCTIONS
        //======================================================================

        fn get_claimed(self: @ContractState, claimer_token_ids: Span<u256>) -> Span<bool> {
            let mut result: Array<bool> = array![];

            let mut i = 0;
            while i != claimer_token_ids.len() {
                result.append(self.claimed.entry(*claimer_token_ids[i]).read());
                i += 1;
            };

            result.span()
        }

        fn get_claimer_token_address(self: @ContractState) -> ContractAddress {
            self.claimer_token_address.read()
        }

        fn get_sale_limit(self: @ContractState) -> u256 {
            self.sale_limit.read()
        }

        fn get_price(self: @ContractState) -> u256 {
            self.price.read()
        }

        fn get_sold_count(self: @ContractState) -> u256 {
            self.sold_count.read()
        }

        fn get_payment_token_address(self: @ContractState) -> ContractAddress {
            self.payment_token_address.read()
        }
    }
}
