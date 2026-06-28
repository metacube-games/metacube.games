use starknet::ContractAddress;
// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts for Cairo ^1.0.0

#[starknet::interface]
trait IClaimContract<TContractState> {
    fn burn(ref self: TContractState, token_id: u256);
    fn safe_mint(ref self: TContractState, recipient: ContractAddress);
    fn safeMint(ref self: TContractState, recipient: ContractAddress);
}

#[starknet::contract]
mod MetacubeSkins {
    use core::num::traits::Zero;
    use openzeppelin::access::ownable::OwnableComponent;
    use openzeppelin::introspection::src5::SRC5Component;
    use openzeppelin::token::common::erc2981::{DefaultConfig, ERC2981Component};
    use openzeppelin::token::erc721::ERC721Component;
    use openzeppelin::token::erc721::extensions::ERC721EnumerableComponent;
    use openzeppelin::upgrades::UpgradeableComponent;
    use openzeppelin::upgrades::interface::IUpgradeable;
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

    //==========================================================================
    // CONSTRUCTOR
    //==========================================================================

    #[constructor]
    fn constructor(
        ref self: ContractState,
        name: ByteArray,
        symbol: ByteArray,
        base_uri: ByteArray,
        owner: ContractAddress,
        royalty: u128,
    ) {
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
    }
}
