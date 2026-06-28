import type { Abi } from "starknet";

export const NFT_ABI = [
  {
    name: "UpgradeableImpl",
    type: "impl",
    interface_name: "openzeppelin_upgrades::interface::IUpgradeable",
  },
  {
    name: "openzeppelin_upgrades::interface::IUpgradeable",
    type: "interface",
    items: [
      {
        name: "upgrade",
        type: "function",
        inputs: [
          {
            name: "new_class_hash",
            type: "core::starknet::class_hash::ClassHash",
          },
        ],
        outputs: [],
        state_mutability: "external",
      },
    ],
  },
  {
    name: "ClaimContract",
    type: "impl",
    interface_name: "claim_contract::IClaimContract",
  },
  {
    name: "core::integer::u256",
    type: "struct",
    members: [
      {
        name: "low",
        type: "core::integer::u128",
      },
      {
        name: "high",
        type: "core::integer::u128",
      },
    ],
  },
  {
    name: "core::array::Span::<core::integer::u256>",
    type: "struct",
    members: [
      {
        name: "snapshot",
        type: "@core::array::Array::<core::integer::u256>",
      },
    ],
  },
  {
    name: "core::bool",
    type: "enum",
    variants: [
      {
        name: "False",
        type: "()",
      },
      {
        name: "True",
        type: "()",
      },
    ],
  },
  {
    name: "core::array::Span::<core::bool>",
    type: "struct",
    members: [
      {
        name: "snapshot",
        type: "@core::array::Array::<core::bool>",
      },
    ],
  },
  {
    name: "claim_contract::IClaimContract",
    type: "interface",
    items: [
      {
        name: "burn",
        type: "function",
        inputs: [
          {
            name: "token_id",
            type: "core::integer::u256",
          },
        ],
        outputs: [],
        state_mutability: "external",
      },
      {
        name: "safe_mint",
        type: "function",
        inputs: [
          {
            name: "recipient",
            type: "core::starknet::contract_address::ContractAddress",
          },
        ],
        outputs: [],
        state_mutability: "external",
      },
      {
        name: "safeMint",
        type: "function",
        inputs: [
          {
            name: "recipient",
            type: "core::starknet::contract_address::ContractAddress",
          },
        ],
        outputs: [],
        state_mutability: "external",
      },
      {
        name: "update_sale_limit",
        type: "function",
        inputs: [
          {
            name: "sale_limit",
            type: "core::integer::u256",
          },
        ],
        outputs: [],
        state_mutability: "external",
      },
      {
        name: "update_price_and_token",
        type: "function",
        inputs: [
          {
            name: "price",
            type: "core::integer::u256",
          },
          {
            name: "token_address",
            type: "core::starknet::contract_address::ContractAddress",
          },
        ],
        outputs: [],
        state_mutability: "external",
      },
      {
        name: "buy",
        type: "function",
        inputs: [],
        outputs: [],
        state_mutability: "external",
      },
      {
        name: "claim",
        type: "function",
        inputs: [
          {
            name: "claimer_token_id",
            type: "core::integer::u256",
          },
        ],
        outputs: [],
        state_mutability: "external",
      },
      {
        name: "get_claimed",
        type: "function",
        inputs: [
          {
            name: "claimer_token_ids",
            type: "core::array::Span::<core::integer::u256>",
          },
        ],
        outputs: [
          {
            type: "core::array::Span::<core::bool>",
          },
        ],
        state_mutability: "view",
      },
      {
        name: "get_claimer_token_address",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::starknet::contract_address::ContractAddress",
          },
        ],
        state_mutability: "view",
      },
      {
        name: "get_sale_limit",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::integer::u256",
          },
        ],
        state_mutability: "view",
      },
      {
        name: "get_price",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::integer::u256",
          },
        ],
        state_mutability: "view",
      },
      {
        name: "get_sold_count",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::integer::u256",
          },
        ],
        state_mutability: "view",
      },
      {
        name: "get_payment_token_address",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::starknet::contract_address::ContractAddress",
          },
        ],
        state_mutability: "view",
      },
    ],
  },
  {
    name: "ERC721MixinImpl",
    type: "impl",
    interface_name: "openzeppelin_token::erc721::interface::ERC721ABI",
  },
  {
    name: "core::array::Span::<core::felt252>",
    type: "struct",
    members: [
      {
        name: "snapshot",
        type: "@core::array::Array::<core::felt252>",
      },
    ],
  },
  {
    name: "core::byte_array::ByteArray",
    type: "struct",
    members: [
      {
        name: "data",
        type: "core::array::Array::<core::bytes_31::bytes31>",
      },
      {
        name: "pending_word",
        type: "core::felt252",
      },
      {
        name: "pending_word_len",
        type: "core::integer::u32",
      },
    ],
  },
  {
    name: "openzeppelin_token::erc721::interface::ERC721ABI",
    type: "interface",
    items: [
      {
        name: "balance_of",
        type: "function",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress",
          },
        ],
        outputs: [
          {
            type: "core::integer::u256",
          },
        ],
        state_mutability: "view",
      },
      {
        name: "owner_of",
        type: "function",
        inputs: [
          {
            name: "token_id",
            type: "core::integer::u256",
          },
        ],
        outputs: [
          {
            type: "core::starknet::contract_address::ContractAddress",
          },
        ],
        state_mutability: "view",
      },
      {
        name: "safe_transfer_from",
        type: "function",
        inputs: [
          {
            name: "from",
            type: "core::starknet::contract_address::ContractAddress",
          },
          {
            name: "to",
            type: "core::starknet::contract_address::ContractAddress",
          },
          {
            name: "token_id",
            type: "core::integer::u256",
          },
          {
            name: "data",
            type: "core::array::Span::<core::felt252>",
          },
        ],
        outputs: [],
        state_mutability: "external",
      },
      {
        name: "transfer_from",
        type: "function",
        inputs: [
          {
            name: "from",
            type: "core::starknet::contract_address::ContractAddress",
          },
          {
            name: "to",
            type: "core::starknet::contract_address::ContractAddress",
          },
          {
            name: "token_id",
            type: "core::integer::u256",
          },
        ],
        outputs: [],
        state_mutability: "external",
      },
      {
        name: "approve",
        type: "function",
        inputs: [
          {
            name: "to",
            type: "core::starknet::contract_address::ContractAddress",
          },
          {
            name: "token_id",
            type: "core::integer::u256",
          },
        ],
        outputs: [],
        state_mutability: "external",
      },
      {
        name: "set_approval_for_all",
        type: "function",
        inputs: [
          {
            name: "operator",
            type: "core::starknet::contract_address::ContractAddress",
          },
          {
            name: "approved",
            type: "core::bool",
          },
        ],
        outputs: [],
        state_mutability: "external",
      },
      {
        name: "get_approved",
        type: "function",
        inputs: [
          {
            name: "token_id",
            type: "core::integer::u256",
          },
        ],
        outputs: [
          {
            type: "core::starknet::contract_address::ContractAddress",
          },
        ],
        state_mutability: "view",
      },
      {
        name: "is_approved_for_all",
        type: "function",
        inputs: [
          {
            name: "owner",
            type: "core::starknet::contract_address::ContractAddress",
          },
          {
            name: "operator",
            type: "core::starknet::contract_address::ContractAddress",
          },
        ],
        outputs: [
          {
            type: "core::bool",
          },
        ],
        state_mutability: "view",
      },
      {
        name: "supports_interface",
        type: "function",
        inputs: [
          {
            name: "interface_id",
            type: "core::felt252",
          },
        ],
        outputs: [
          {
            type: "core::bool",
          },
        ],
        state_mutability: "view",
      },
      {
        name: "name",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::byte_array::ByteArray",
          },
        ],
        state_mutability: "view",
      },
      {
        name: "symbol",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::byte_array::ByteArray",
          },
        ],
        state_mutability: "view",
      },
      {
        name: "token_uri",
        type: "function",
        inputs: [
          {
            name: "token_id",
            type: "core::integer::u256",
          },
        ],
        outputs: [
          {
            type: "core::byte_array::ByteArray",
          },
        ],
        state_mutability: "view",
      },
      {
        name: "balanceOf",
        type: "function",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress",
          },
        ],
        outputs: [
          {
            type: "core::integer::u256",
          },
        ],
        state_mutability: "view",
      },
      {
        name: "ownerOf",
        type: "function",
        inputs: [
          {
            name: "tokenId",
            type: "core::integer::u256",
          },
        ],
        outputs: [
          {
            type: "core::starknet::contract_address::ContractAddress",
          },
        ],
        state_mutability: "view",
      },
      {
        name: "safeTransferFrom",
        type: "function",
        inputs: [
          {
            name: "from",
            type: "core::starknet::contract_address::ContractAddress",
          },
          {
            name: "to",
            type: "core::starknet::contract_address::ContractAddress",
          },
          {
            name: "tokenId",
            type: "core::integer::u256",
          },
          {
            name: "data",
            type: "core::array::Span::<core::felt252>",
          },
        ],
        outputs: [],
        state_mutability: "external",
      },
      {
        name: "transferFrom",
        type: "function",
        inputs: [
          {
            name: "from",
            type: "core::starknet::contract_address::ContractAddress",
          },
          {
            name: "to",
            type: "core::starknet::contract_address::ContractAddress",
          },
          {
            name: "tokenId",
            type: "core::integer::u256",
          },
        ],
        outputs: [],
        state_mutability: "external",
      },
      {
        name: "setApprovalForAll",
        type: "function",
        inputs: [
          {
            name: "operator",
            type: "core::starknet::contract_address::ContractAddress",
          },
          {
            name: "approved",
            type: "core::bool",
          },
        ],
        outputs: [],
        state_mutability: "external",
      },
      {
        name: "getApproved",
        type: "function",
        inputs: [
          {
            name: "tokenId",
            type: "core::integer::u256",
          },
        ],
        outputs: [
          {
            type: "core::starknet::contract_address::ContractAddress",
          },
        ],
        state_mutability: "view",
      },
      {
        name: "isApprovedForAll",
        type: "function",
        inputs: [
          {
            name: "owner",
            type: "core::starknet::contract_address::ContractAddress",
          },
          {
            name: "operator",
            type: "core::starknet::contract_address::ContractAddress",
          },
        ],
        outputs: [
          {
            type: "core::bool",
          },
        ],
        state_mutability: "view",
      },
      {
        name: "tokenURI",
        type: "function",
        inputs: [
          {
            name: "tokenId",
            type: "core::integer::u256",
          },
        ],
        outputs: [
          {
            type: "core::byte_array::ByteArray",
          },
        ],
        state_mutability: "view",
      },
    ],
  },
  {
    name: "OwnableMixinImpl",
    type: "impl",
    interface_name: "openzeppelin_access::ownable::interface::OwnableABI",
  },
  {
    name: "openzeppelin_access::ownable::interface::OwnableABI",
    type: "interface",
    items: [
      {
        name: "owner",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::starknet::contract_address::ContractAddress",
          },
        ],
        state_mutability: "view",
      },
      {
        name: "transfer_ownership",
        type: "function",
        inputs: [
          {
            name: "new_owner",
            type: "core::starknet::contract_address::ContractAddress",
          },
        ],
        outputs: [],
        state_mutability: "external",
      },
      {
        name: "renounce_ownership",
        type: "function",
        inputs: [],
        outputs: [],
        state_mutability: "external",
      },
      {
        name: "transferOwnership",
        type: "function",
        inputs: [
          {
            name: "newOwner",
            type: "core::starknet::contract_address::ContractAddress",
          },
        ],
        outputs: [],
        state_mutability: "external",
      },
      {
        name: "renounceOwnership",
        type: "function",
        inputs: [],
        outputs: [],
        state_mutability: "external",
      },
    ],
  },
  {
    name: "ERC721EnumerableImpl",
    type: "impl",
    interface_name:
      "openzeppelin_token::erc721::extensions::erc721_enumerable::interface::IERC721Enumerable",
  },
  {
    name: "openzeppelin_token::erc721::extensions::erc721_enumerable::interface::IERC721Enumerable",
    type: "interface",
    items: [
      {
        name: "total_supply",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::integer::u256",
          },
        ],
        state_mutability: "view",
      },
      {
        name: "token_by_index",
        type: "function",
        inputs: [
          {
            name: "index",
            type: "core::integer::u256",
          },
        ],
        outputs: [
          {
            type: "core::integer::u256",
          },
        ],
        state_mutability: "view",
      },
      {
        name: "token_of_owner_by_index",
        type: "function",
        inputs: [
          {
            name: "owner",
            type: "core::starknet::contract_address::ContractAddress",
          },
          {
            name: "index",
            type: "core::integer::u256",
          },
        ],
        outputs: [
          {
            type: "core::integer::u256",
          },
        ],
        state_mutability: "view",
      },
    ],
  },
  {
    name: "ERC2981Impl",
    type: "impl",
    interface_name: "openzeppelin_token::common::erc2981::interface::IERC2981",
  },
  {
    name: "openzeppelin_token::common::erc2981::interface::IERC2981",
    type: "interface",
    items: [
      {
        name: "royalty_info",
        type: "function",
        inputs: [
          {
            name: "token_id",
            type: "core::integer::u256",
          },
          {
            name: "sale_price",
            type: "core::integer::u256",
          },
        ],
        outputs: [
          {
            type: "(core::starknet::contract_address::ContractAddress, core::integer::u256)",
          },
        ],
        state_mutability: "view",
      },
    ],
  },
  {
    name: "ERC2981InfoImpl",
    type: "impl",
    interface_name:
      "openzeppelin_token::common::erc2981::interface::IERC2981Info",
  },
  {
    name: "openzeppelin_token::common::erc2981::interface::IERC2981Info",
    type: "interface",
    items: [
      {
        name: "default_royalty",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "(core::starknet::contract_address::ContractAddress, core::integer::u128, core::integer::u128)",
          },
        ],
        state_mutability: "view",
      },
      {
        name: "token_royalty",
        type: "function",
        inputs: [
          {
            name: "token_id",
            type: "core::integer::u256",
          },
        ],
        outputs: [
          {
            type: "(core::starknet::contract_address::ContractAddress, core::integer::u128, core::integer::u128)",
          },
        ],
        state_mutability: "view",
      },
    ],
  },
  {
    name: "ERC2981AdminOwnableImpl",
    type: "impl",
    interface_name:
      "openzeppelin_token::common::erc2981::interface::IERC2981Admin",
  },
  {
    name: "openzeppelin_token::common::erc2981::interface::IERC2981Admin",
    type: "interface",
    items: [
      {
        name: "set_default_royalty",
        type: "function",
        inputs: [
          {
            name: "receiver",
            type: "core::starknet::contract_address::ContractAddress",
          },
          {
            name: "fee_numerator",
            type: "core::integer::u128",
          },
        ],
        outputs: [],
        state_mutability: "external",
      },
      {
        name: "delete_default_royalty",
        type: "function",
        inputs: [],
        outputs: [],
        state_mutability: "external",
      },
      {
        name: "set_token_royalty",
        type: "function",
        inputs: [
          {
            name: "token_id",
            type: "core::integer::u256",
          },
          {
            name: "receiver",
            type: "core::starknet::contract_address::ContractAddress",
          },
          {
            name: "fee_numerator",
            type: "core::integer::u128",
          },
        ],
        outputs: [],
        state_mutability: "external",
      },
      {
        name: "reset_token_royalty",
        type: "function",
        inputs: [
          {
            name: "token_id",
            type: "core::integer::u256",
          },
        ],
        outputs: [],
        state_mutability: "external",
      },
    ],
  },
  {
    name: "constructor",
    type: "constructor",
    inputs: [
      {
        name: "claimer_token_address",
        type: "core::starknet::contract_address::ContractAddress",
      },
      {
        name: "name",
        type: "core::byte_array::ByteArray",
      },
      {
        name: "symbol",
        type: "core::byte_array::ByteArray",
      },
      {
        name: "base_uri",
        type: "core::byte_array::ByteArray",
      },
      {
        name: "owner",
        type: "core::starknet::contract_address::ContractAddress",
      },
      {
        name: "royalty",
        type: "core::integer::u128",
      },
    ],
  },
  {
    kind: "struct",
    name: "claim_contract::ClaimContract::Buy",
    type: "event",
    members: [
      {
        kind: "data",
        name: "token_id",
        type: "core::integer::u256",
      },
      {
        kind: "key",
        name: "minter",
        type: "core::starknet::contract_address::ContractAddress",
      },
    ],
  },
  {
    kind: "struct",
    name: "claim_contract::ClaimContract::Claim",
    type: "event",
    members: [
      {
        kind: "data",
        name: "claimer_token_id",
        type: "core::integer::u256",
      },
      {
        kind: "data",
        name: "token_id",
        type: "core::integer::u256",
      },
      {
        kind: "key",
        name: "minter",
        type: "core::starknet::contract_address::ContractAddress",
      },
    ],
  },
  {
    kind: "struct",
    name: "claim_contract::ClaimContract::UpdateClaimStatus",
    type: "event",
    members: [
      {
        kind: "data",
        name: "new_status",
        type: "core::bool",
      },
    ],
  },
  {
    kind: "struct",
    name: "claim_contract::ClaimContract::UpdateSaleLimit",
    type: "event",
    members: [
      {
        kind: "data",
        name: "sale_limit",
        type: "core::integer::u256",
      },
    ],
  },
  {
    kind: "struct",
    name: "claim_contract::ClaimContract::UpdatePriceAndToken",
    type: "event",
    members: [
      {
        kind: "data",
        name: "price",
        type: "core::integer::u256",
      },
      {
        kind: "data",
        name: "token_address",
        type: "core::starknet::contract_address::ContractAddress",
      },
    ],
  },
  {
    kind: "struct",
    name: "openzeppelin_token::erc721::erc721::ERC721Component::Transfer",
    type: "event",
    members: [
      {
        kind: "key",
        name: "from",
        type: "core::starknet::contract_address::ContractAddress",
      },
      {
        kind: "key",
        name: "to",
        type: "core::starknet::contract_address::ContractAddress",
      },
      {
        kind: "key",
        name: "token_id",
        type: "core::integer::u256",
      },
    ],
  },
  {
    kind: "struct",
    name: "openzeppelin_token::erc721::erc721::ERC721Component::Approval",
    type: "event",
    members: [
      {
        kind: "key",
        name: "owner",
        type: "core::starknet::contract_address::ContractAddress",
      },
      {
        kind: "key",
        name: "approved",
        type: "core::starknet::contract_address::ContractAddress",
      },
      {
        kind: "key",
        name: "token_id",
        type: "core::integer::u256",
      },
    ],
  },
  {
    kind: "struct",
    name: "openzeppelin_token::erc721::erc721::ERC721Component::ApprovalForAll",
    type: "event",
    members: [
      {
        kind: "key",
        name: "owner",
        type: "core::starknet::contract_address::ContractAddress",
      },
      {
        kind: "key",
        name: "operator",
        type: "core::starknet::contract_address::ContractAddress",
      },
      {
        kind: "data",
        name: "approved",
        type: "core::bool",
      },
    ],
  },
  {
    kind: "enum",
    name: "openzeppelin_token::erc721::erc721::ERC721Component::Event",
    type: "event",
    variants: [
      {
        kind: "nested",
        name: "Transfer",
        type: "openzeppelin_token::erc721::erc721::ERC721Component::Transfer",
      },
      {
        kind: "nested",
        name: "Approval",
        type: "openzeppelin_token::erc721::erc721::ERC721Component::Approval",
      },
      {
        kind: "nested",
        name: "ApprovalForAll",
        type: "openzeppelin_token::erc721::erc721::ERC721Component::ApprovalForAll",
      },
    ],
  },
  {
    kind: "enum",
    name: "openzeppelin_introspection::src5::SRC5Component::Event",
    type: "event",
    variants: [],
  },
  {
    kind: "struct",
    name: "openzeppelin_access::ownable::ownable::OwnableComponent::OwnershipTransferred",
    type: "event",
    members: [
      {
        kind: "key",
        name: "previous_owner",
        type: "core::starknet::contract_address::ContractAddress",
      },
      {
        kind: "key",
        name: "new_owner",
        type: "core::starknet::contract_address::ContractAddress",
      },
    ],
  },
  {
    kind: "struct",
    name: "openzeppelin_access::ownable::ownable::OwnableComponent::OwnershipTransferStarted",
    type: "event",
    members: [
      {
        kind: "key",
        name: "previous_owner",
        type: "core::starknet::contract_address::ContractAddress",
      },
      {
        kind: "key",
        name: "new_owner",
        type: "core::starknet::contract_address::ContractAddress",
      },
    ],
  },
  {
    kind: "enum",
    name: "openzeppelin_access::ownable::ownable::OwnableComponent::Event",
    type: "event",
    variants: [
      {
        kind: "nested",
        name: "OwnershipTransferred",
        type: "openzeppelin_access::ownable::ownable::OwnableComponent::OwnershipTransferred",
      },
      {
        kind: "nested",
        name: "OwnershipTransferStarted",
        type: "openzeppelin_access::ownable::ownable::OwnableComponent::OwnershipTransferStarted",
      },
    ],
  },
  {
    kind: "enum",
    name: "openzeppelin_token::erc721::extensions::erc721_enumerable::erc721_enumerable::ERC721EnumerableComponent::Event",
    type: "event",
    variants: [],
  },
  {
    kind: "struct",
    name: "openzeppelin_upgrades::upgradeable::UpgradeableComponent::Upgraded",
    type: "event",
    members: [
      {
        kind: "data",
        name: "class_hash",
        type: "core::starknet::class_hash::ClassHash",
      },
    ],
  },
  {
    kind: "enum",
    name: "openzeppelin_upgrades::upgradeable::UpgradeableComponent::Event",
    type: "event",
    variants: [
      {
        kind: "nested",
        name: "Upgraded",
        type: "openzeppelin_upgrades::upgradeable::UpgradeableComponent::Upgraded",
      },
    ],
  },
  {
    kind: "enum",
    name: "openzeppelin_token::common::erc2981::erc2981::ERC2981Component::Event",
    type: "event",
    variants: [],
  },
  {
    kind: "enum",
    name: "claim_contract::ClaimContract::Event",
    type: "event",
    variants: [
      {
        kind: "nested",
        name: "Buy",
        type: "claim_contract::ClaimContract::Buy",
      },
      {
        kind: "nested",
        name: "Claim",
        type: "claim_contract::ClaimContract::Claim",
      },
      {
        kind: "nested",
        name: "UpdateClaimStatus",
        type: "claim_contract::ClaimContract::UpdateClaimStatus",
      },
      {
        kind: "nested",
        name: "UpdateSaleLimit",
        type: "claim_contract::ClaimContract::UpdateSaleLimit",
      },
      {
        kind: "nested",
        name: "UpdatePriceAndToken",
        type: "claim_contract::ClaimContract::UpdatePriceAndToken",
      },
      {
        kind: "flat",
        name: "ERC721Event",
        type: "openzeppelin_token::erc721::erc721::ERC721Component::Event",
      },
      {
        kind: "flat",
        name: "SRC5Event",
        type: "openzeppelin_introspection::src5::SRC5Component::Event",
      },
      {
        kind: "flat",
        name: "OwnableEvent",
        type: "openzeppelin_access::ownable::ownable::OwnableComponent::Event",
      },
      {
        kind: "flat",
        name: "ERC721EnumerableEvent",
        type: "openzeppelin_token::erc721::extensions::erc721_enumerable::erc721_enumerable::ERC721EnumerableComponent::Event",
      },
      {
        kind: "flat",
        name: "UpgradeableEvent",
        type: "openzeppelin_upgrades::upgradeable::UpgradeableComponent::Event",
      },
      {
        kind: "flat",
        name: "ERC2981Event",
        type: "openzeppelin_token::common::erc2981::erc2981::ERC2981Component::Event",
      },
    ],
  },
] as const as Abi;

export const MARKETPLACE_ABI = [
  {
    name: "MetacubeMarket",
    type: "impl",
    interface_name: "market_contract::IMetacubeMarket",
  },
  {
    name: "core::integer::u256",
    type: "struct",
    members: [
      {
        name: "low",
        type: "core::integer::u128",
      },
      {
        name: "high",
        type: "core::integer::u128",
      },
    ],
  },
  {
    name: "market_contract::OrderStatus",
    type: "struct",
    members: [
      {
        name: "order_creator",
        type: "core::starknet::contract_address::ContractAddress",
      },
      {
        name: "payment_token_amount",
        type: "core::integer::u256",
      },
      {
        name: "payment_token_address",
        type: "core::starknet::contract_address::ContractAddress",
      },
      {
        name: "expiration_timestamp",
        type: "core::integer::u64",
      },
    ],
  },
  {
    name: "market_contract::IMetacubeMarket",
    type: "interface",
    items: [
      {
        name: "list_order",
        type: "function",
        inputs: [
          {
            name: "collection_address",
            type: "core::starknet::contract_address::ContractAddress",
          },
          {
            name: "token_id",
            type: "core::integer::u256",
          },
          {
            name: "payment_token_amount",
            type: "core::integer::u256",
          },
          {
            name: "payment_token_address",
            type: "core::starknet::contract_address::ContractAddress",
          },
          {
            name: "expiration_timestamp",
            type: "core::integer::u64",
          },
        ],
        outputs: [],
        state_mutability: "external",
      },
      {
        name: "delist_order",
        type: "function",
        inputs: [
          {
            name: "collection_address",
            type: "core::starknet::contract_address::ContractAddress",
          },
          {
            name: "token_id",
            type: "core::integer::u256",
          },
        ],
        outputs: [],
        state_mutability: "external",
      },
      {
        name: "buy",
        type: "function",
        inputs: [
          {
            name: "collection_address",
            type: "core::starknet::contract_address::ContractAddress",
          },
          {
            name: "token_id",
            type: "core::integer::u256",
          },
        ],
        outputs: [],
        state_mutability: "external",
      },
      {
        name: "get_order_status",
        type: "function",
        inputs: [
          {
            name: "collection_address",
            type: "core::starknet::contract_address::ContractAddress",
          },
          {
            name: "token_id",
            type: "core::integer::u256",
          },
        ],
        outputs: [
          {
            type: "market_contract::OrderStatus",
          },
        ],
        state_mutability: "view",
      },
    ],
  },
  {
    name: "constructor",
    type: "constructor",
    inputs: [],
  },
  {
    kind: "struct",
    name: "market_contract::MetacubeMarket::ListOrder",
    type: "event",
    members: [
      {
        kind: "data",
        name: "token_id",
        type: "core::integer::u256",
      },
      {
        kind: "data",
        name: "payment_token_amount",
        type: "core::integer::u256",
      },
      {
        kind: "data",
        name: "payment_token_address",
        type: "core::starknet::contract_address::ContractAddress",
      },
      {
        kind: "data",
        name: "expiration_timestamp",
        type: "core::integer::u64",
      },
      {
        kind: "data",
        name: "order_creator",
        type: "core::starknet::contract_address::ContractAddress",
      },
      {
        kind: "key",
        name: "collection_address",
        type: "core::starknet::contract_address::ContractAddress",
      },
    ],
  },
  {
    kind: "struct",
    name: "market_contract::MetacubeMarket::DelistOrder",
    type: "event",
    members: [
      {
        kind: "data",
        name: "token_id",
        type: "core::integer::u256",
      },
      {
        kind: "key",
        name: "collection_address",
        type: "core::starknet::contract_address::ContractAddress",
      },
    ],
  },
  {
    kind: "struct",
    name: "market_contract::MetacubeMarket::Buy",
    type: "event",
    members: [
      {
        kind: "data",
        name: "collection_address",
        type: "core::starknet::contract_address::ContractAddress",
      },
      {
        kind: "data",
        name: "token_id",
        type: "core::integer::u256",
      },
    ],
  },
  {
    kind: "enum",
    name: "market_contract::MetacubeMarket::Event",
    type: "event",
    variants: [
      {
        kind: "nested",
        name: "ListOrder",
        type: "market_contract::MetacubeMarket::ListOrder",
      },
      {
        kind: "nested",
        name: "DelistOrder",
        type: "market_contract::MetacubeMarket::DelistOrder",
      },
      {
        kind: "nested",
        name: "Buy",
        type: "market_contract::MetacubeMarket::Buy",
      },
    ],
  },
] as const as Abi;

export const ERC20_ABI = [
  {
    name: "MintableToken",
    type: "impl",
    interface_name: "src::mintable_token_interface::IMintableToken",
  },
  {
    name: "core::integer::u256",
    type: "struct",
    members: [
      {
        name: "low",
        type: "core::integer::u128",
      },
      {
        name: "high",
        type: "core::integer::u128",
      },
    ],
  },
  {
    name: "src::mintable_token_interface::IMintableToken",
    type: "interface",
    items: [
      {
        name: "permissioned_mint",
        type: "function",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress",
          },
          {
            name: "amount",
            type: "core::integer::u256",
          },
        ],
        outputs: [],
        state_mutability: "external",
      },
      {
        name: "permissioned_burn",
        type: "function",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress",
          },
          {
            name: "amount",
            type: "core::integer::u256",
          },
        ],
        outputs: [],
        state_mutability: "external",
      },
    ],
  },
  {
    name: "MintableTokenCamelImpl",
    type: "impl",
    interface_name: "src::mintable_token_interface::IMintableTokenCamel",
  },
  {
    name: "src::mintable_token_interface::IMintableTokenCamel",
    type: "interface",
    items: [
      {
        name: "permissionedMint",
        type: "function",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress",
          },
          {
            name: "amount",
            type: "core::integer::u256",
          },
        ],
        outputs: [],
        state_mutability: "external",
      },
      {
        name: "permissionedBurn",
        type: "function",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress",
          },
          {
            name: "amount",
            type: "core::integer::u256",
          },
        ],
        outputs: [],
        state_mutability: "external",
      },
    ],
  },
  {
    name: "Replaceable",
    type: "impl",
    interface_name: "src::replaceability_interface::IReplaceable",
  },
  {
    name: "core::array::Span::<core::felt252>",
    type: "struct",
    members: [
      {
        name: "snapshot",
        type: "@core::array::Array::<core::felt252>",
      },
    ],
  },
  {
    name: "src::replaceability_interface::EICData",
    type: "struct",
    members: [
      {
        name: "eic_hash",
        type: "core::starknet::class_hash::ClassHash",
      },
      {
        name: "eic_init_data",
        type: "core::array::Span::<core::felt252>",
      },
    ],
  },
  {
    name: "core::option::Option::<src::replaceability_interface::EICData>",
    type: "enum",
    variants: [
      {
        name: "Some",
        type: "src::replaceability_interface::EICData",
      },
      {
        name: "None",
        type: "()",
      },
    ],
  },
  {
    name: "core::bool",
    type: "enum",
    variants: [
      {
        name: "False",
        type: "()",
      },
      {
        name: "True",
        type: "()",
      },
    ],
  },
  {
    name: "src::replaceability_interface::ImplementationData",
    type: "struct",
    members: [
      {
        name: "impl_hash",
        type: "core::starknet::class_hash::ClassHash",
      },
      {
        name: "eic_data",
        type: "core::option::Option::<src::replaceability_interface::EICData>",
      },
      {
        name: "final",
        type: "core::bool",
      },
    ],
  },
  {
    name: "src::replaceability_interface::IReplaceable",
    type: "interface",
    items: [
      {
        name: "get_upgrade_delay",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::integer::u64",
          },
        ],
        state_mutability: "view",
      },
      {
        name: "get_impl_activation_time",
        type: "function",
        inputs: [
          {
            name: "implementation_data",
            type: "src::replaceability_interface::ImplementationData",
          },
        ],
        outputs: [
          {
            type: "core::integer::u64",
          },
        ],
        state_mutability: "view",
      },
      {
        name: "add_new_implementation",
        type: "function",
        inputs: [
          {
            name: "implementation_data",
            type: "src::replaceability_interface::ImplementationData",
          },
        ],
        outputs: [],
        state_mutability: "external",
      },
      {
        name: "remove_implementation",
        type: "function",
        inputs: [
          {
            name: "implementation_data",
            type: "src::replaceability_interface::ImplementationData",
          },
        ],
        outputs: [],
        state_mutability: "external",
      },
      {
        name: "replace_to",
        type: "function",
        inputs: [
          {
            name: "implementation_data",
            type: "src::replaceability_interface::ImplementationData",
          },
        ],
        outputs: [],
        state_mutability: "external",
      },
    ],
  },
  {
    name: "AccessControlImplExternal",
    type: "impl",
    interface_name: "src::access_control_interface::IAccessControl",
  },
  {
    name: "src::access_control_interface::IAccessControl",
    type: "interface",
    items: [
      {
        name: "has_role",
        type: "function",
        inputs: [
          {
            name: "role",
            type: "core::felt252",
          },
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress",
          },
        ],
        outputs: [
          {
            type: "core::bool",
          },
        ],
        state_mutability: "view",
      },
      {
        name: "get_role_admin",
        type: "function",
        inputs: [
          {
            name: "role",
            type: "core::felt252",
          },
        ],
        outputs: [
          {
            type: "core::felt252",
          },
        ],
        state_mutability: "view",
      },
    ],
  },
  {
    name: "RolesImpl",
    type: "impl",
    interface_name: "src::roles_interface::IMinimalRoles",
  },
  {
    name: "src::roles_interface::IMinimalRoles",
    type: "interface",
    items: [
      {
        name: "is_governance_admin",
        type: "function",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress",
          },
        ],
        outputs: [
          {
            type: "core::bool",
          },
        ],
        state_mutability: "view",
      },
      {
        name: "is_upgrade_governor",
        type: "function",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress",
          },
        ],
        outputs: [
          {
            type: "core::bool",
          },
        ],
        state_mutability: "view",
      },
      {
        name: "register_governance_admin",
        type: "function",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress",
          },
        ],
        outputs: [],
        state_mutability: "external",
      },
      {
        name: "remove_governance_admin",
        type: "function",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress",
          },
        ],
        outputs: [],
        state_mutability: "external",
      },
      {
        name: "register_upgrade_governor",
        type: "function",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress",
          },
        ],
        outputs: [],
        state_mutability: "external",
      },
      {
        name: "remove_upgrade_governor",
        type: "function",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress",
          },
        ],
        outputs: [],
        state_mutability: "external",
      },
      {
        name: "renounce",
        type: "function",
        inputs: [
          {
            name: "role",
            type: "core::felt252",
          },
        ],
        outputs: [],
        state_mutability: "external",
      },
    ],
  },
  {
    name: "ERC20Impl",
    type: "impl",
    interface_name: "openzeppelin::token::erc20::interface::IERC20",
  },
  {
    name: "openzeppelin::token::erc20::interface::IERC20",
    type: "interface",
    items: [
      {
        name: "name",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::felt252",
          },
        ],
        state_mutability: "view",
      },
      {
        name: "symbol",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::felt252",
          },
        ],
        state_mutability: "view",
      },
      {
        name: "decimals",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::integer::u8",
          },
        ],
        state_mutability: "view",
      },
      {
        name: "total_supply",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::integer::u256",
          },
        ],
        state_mutability: "view",
      },
      {
        name: "balance_of",
        type: "function",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress",
          },
        ],
        outputs: [
          {
            type: "core::integer::u256",
          },
        ],
        state_mutability: "view",
      },
      {
        name: "allowance",
        type: "function",
        inputs: [
          {
            name: "owner",
            type: "core::starknet::contract_address::ContractAddress",
          },
          {
            name: "spender",
            type: "core::starknet::contract_address::ContractAddress",
          },
        ],
        outputs: [
          {
            type: "core::integer::u256",
          },
        ],
        state_mutability: "view",
      },
      {
        name: "transfer",
        type: "function",
        inputs: [
          {
            name: "recipient",
            type: "core::starknet::contract_address::ContractAddress",
          },
          {
            name: "amount",
            type: "core::integer::u256",
          },
        ],
        outputs: [
          {
            type: "core::bool",
          },
        ],
        state_mutability: "external",
      },
      {
        name: "transfer_from",
        type: "function",
        inputs: [
          {
            name: "sender",
            type: "core::starknet::contract_address::ContractAddress",
          },
          {
            name: "recipient",
            type: "core::starknet::contract_address::ContractAddress",
          },
          {
            name: "amount",
            type: "core::integer::u256",
          },
        ],
        outputs: [
          {
            type: "core::bool",
          },
        ],
        state_mutability: "external",
      },
      {
        name: "approve",
        type: "function",
        inputs: [
          {
            name: "spender",
            type: "core::starknet::contract_address::ContractAddress",
          },
          {
            name: "amount",
            type: "core::integer::u256",
          },
        ],
        outputs: [
          {
            type: "core::bool",
          },
        ],
        state_mutability: "external",
      },
    ],
  },
  {
    name: "ERC20CamelOnlyImpl",
    type: "impl",
    interface_name: "openzeppelin::token::erc20::interface::IERC20CamelOnly",
  },
  {
    name: "openzeppelin::token::erc20::interface::IERC20CamelOnly",
    type: "interface",
    items: [
      {
        name: "totalSupply",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::integer::u256",
          },
        ],
        state_mutability: "view",
      },
      {
        name: "balanceOf",
        type: "function",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress",
          },
        ],
        outputs: [
          {
            type: "core::integer::u256",
          },
        ],
        state_mutability: "view",
      },
      {
        name: "transferFrom",
        type: "function",
        inputs: [
          {
            name: "sender",
            type: "core::starknet::contract_address::ContractAddress",
          },
          {
            name: "recipient",
            type: "core::starknet::contract_address::ContractAddress",
          },
          {
            name: "amount",
            type: "core::integer::u256",
          },
        ],
        outputs: [
          {
            type: "core::bool",
          },
        ],
        state_mutability: "external",
      },
    ],
  },
  {
    name: "constructor",
    type: "constructor",
    inputs: [
      {
        name: "name",
        type: "core::felt252",
      },
      {
        name: "symbol",
        type: "core::felt252",
      },
      {
        name: "decimals",
        type: "core::integer::u8",
      },
      {
        name: "initial_supply",
        type: "core::integer::u256",
      },
      {
        name: "recipient",
        type: "core::starknet::contract_address::ContractAddress",
      },
      {
        name: "permitted_minter",
        type: "core::starknet::contract_address::ContractAddress",
      },
      {
        name: "provisional_governance_admin",
        type: "core::starknet::contract_address::ContractAddress",
      },
      {
        name: "upgrade_delay",
        type: "core::integer::u64",
      },
    ],
  },
  {
    name: "increase_allowance",
    type: "function",
    inputs: [
      {
        name: "spender",
        type: "core::starknet::contract_address::ContractAddress",
      },
      {
        name: "added_value",
        type: "core::integer::u256",
      },
    ],
    outputs: [
      {
        type: "core::bool",
      },
    ],
    state_mutability: "external",
  },
  {
    name: "decrease_allowance",
    type: "function",
    inputs: [
      {
        name: "spender",
        type: "core::starknet::contract_address::ContractAddress",
      },
      {
        name: "subtracted_value",
        type: "core::integer::u256",
      },
    ],
    outputs: [
      {
        type: "core::bool",
      },
    ],
    state_mutability: "external",
  },
  {
    name: "increaseAllowance",
    type: "function",
    inputs: [
      {
        name: "spender",
        type: "core::starknet::contract_address::ContractAddress",
      },
      {
        name: "addedValue",
        type: "core::integer::u256",
      },
    ],
    outputs: [
      {
        type: "core::bool",
      },
    ],
    state_mutability: "external",
  },
  {
    name: "decreaseAllowance",
    type: "function",
    inputs: [
      {
        name: "spender",
        type: "core::starknet::contract_address::ContractAddress",
      },
      {
        name: "subtractedValue",
        type: "core::integer::u256",
      },
    ],
    outputs: [
      {
        type: "core::bool",
      },
    ],
    state_mutability: "external",
  },
  {
    kind: "struct",
    name: "openzeppelin::token::erc20_v070::erc20::ERC20::Transfer",
    type: "event",
    members: [
      {
        kind: "data",
        name: "from",
        type: "core::starknet::contract_address::ContractAddress",
      },
      {
        kind: "data",
        name: "to",
        type: "core::starknet::contract_address::ContractAddress",
      },
      {
        kind: "data",
        name: "value",
        type: "core::integer::u256",
      },
    ],
  },
  {
    kind: "struct",
    name: "openzeppelin::token::erc20_v070::erc20::ERC20::Approval",
    type: "event",
    members: [
      {
        kind: "data",
        name: "owner",
        type: "core::starknet::contract_address::ContractAddress",
      },
      {
        kind: "data",
        name: "spender",
        type: "core::starknet::contract_address::ContractAddress",
      },
      {
        kind: "data",
        name: "value",
        type: "core::integer::u256",
      },
    ],
  },
  {
    kind: "struct",
    name: "src::replaceability_interface::ImplementationAdded",
    type: "event",
    members: [
      {
        kind: "data",
        name: "implementation_data",
        type: "src::replaceability_interface::ImplementationData",
      },
    ],
  },
  {
    kind: "struct",
    name: "src::replaceability_interface::ImplementationRemoved",
    type: "event",
    members: [
      {
        kind: "data",
        name: "implementation_data",
        type: "src::replaceability_interface::ImplementationData",
      },
    ],
  },
  {
    kind: "struct",
    name: "src::replaceability_interface::ImplementationReplaced",
    type: "event",
    members: [
      {
        kind: "data",
        name: "implementation_data",
        type: "src::replaceability_interface::ImplementationData",
      },
    ],
  },
  {
    kind: "struct",
    name: "src::replaceability_interface::ImplementationFinalized",
    type: "event",
    members: [
      {
        kind: "data",
        name: "impl_hash",
        type: "core::starknet::class_hash::ClassHash",
      },
    ],
  },
  {
    kind: "struct",
    name: "src::access_control_interface::RoleGranted",
    type: "event",
    members: [
      {
        kind: "data",
        name: "role",
        type: "core::felt252",
      },
      {
        kind: "data",
        name: "account",
        type: "core::starknet::contract_address::ContractAddress",
      },
      {
        kind: "data",
        name: "sender",
        type: "core::starknet::contract_address::ContractAddress",
      },
    ],
  },
  {
    kind: "struct",
    name: "src::access_control_interface::RoleRevoked",
    type: "event",
    members: [
      {
        kind: "data",
        name: "role",
        type: "core::felt252",
      },
      {
        kind: "data",
        name: "account",
        type: "core::starknet::contract_address::ContractAddress",
      },
      {
        kind: "data",
        name: "sender",
        type: "core::starknet::contract_address::ContractAddress",
      },
    ],
  },
  {
    kind: "struct",
    name: "src::access_control_interface::RoleAdminChanged",
    type: "event",
    members: [
      {
        kind: "data",
        name: "role",
        type: "core::felt252",
      },
      {
        kind: "data",
        name: "previous_admin_role",
        type: "core::felt252",
      },
      {
        kind: "data",
        name: "new_admin_role",
        type: "core::felt252",
      },
    ],
  },
  {
    kind: "struct",
    name: "src::roles_interface::GovernanceAdminAdded",
    type: "event",
    members: [
      {
        kind: "data",
        name: "added_account",
        type: "core::starknet::contract_address::ContractAddress",
      },
      {
        kind: "data",
        name: "added_by",
        type: "core::starknet::contract_address::ContractAddress",
      },
    ],
  },
  {
    kind: "struct",
    name: "src::roles_interface::GovernanceAdminRemoved",
    type: "event",
    members: [
      {
        kind: "data",
        name: "removed_account",
        type: "core::starknet::contract_address::ContractAddress",
      },
      {
        kind: "data",
        name: "removed_by",
        type: "core::starknet::contract_address::ContractAddress",
      },
    ],
  },
  {
    kind: "struct",
    name: "src::roles_interface::UpgradeGovernorAdded",
    type: "event",
    members: [
      {
        kind: "data",
        name: "added_account",
        type: "core::starknet::contract_address::ContractAddress",
      },
      {
        kind: "data",
        name: "added_by",
        type: "core::starknet::contract_address::ContractAddress",
      },
    ],
  },
  {
    kind: "struct",
    name: "src::roles_interface::UpgradeGovernorRemoved",
    type: "event",
    members: [
      {
        kind: "data",
        name: "removed_account",
        type: "core::starknet::contract_address::ContractAddress",
      },
      {
        kind: "data",
        name: "removed_by",
        type: "core::starknet::contract_address::ContractAddress",
      },
    ],
  },
  {
    kind: "enum",
    name: "openzeppelin::token::erc20_v070::erc20::ERC20::Event",
    type: "event",
    variants: [
      {
        kind: "nested",
        name: "Transfer",
        type: "openzeppelin::token::erc20_v070::erc20::ERC20::Transfer",
      },
      {
        kind: "nested",
        name: "Approval",
        type: "openzeppelin::token::erc20_v070::erc20::ERC20::Approval",
      },
      {
        kind: "nested",
        name: "ImplementationAdded",
        type: "src::replaceability_interface::ImplementationAdded",
      },
      {
        kind: "nested",
        name: "ImplementationRemoved",
        type: "src::replaceability_interface::ImplementationRemoved",
      },
      {
        kind: "nested",
        name: "ImplementationReplaced",
        type: "src::replaceability_interface::ImplementationReplaced",
      },
      {
        kind: "nested",
        name: "ImplementationFinalized",
        type: "src::replaceability_interface::ImplementationFinalized",
      },
      {
        kind: "nested",
        name: "RoleGranted",
        type: "src::access_control_interface::RoleGranted",
      },
      {
        kind: "nested",
        name: "RoleRevoked",
        type: "src::access_control_interface::RoleRevoked",
      },
      {
        kind: "nested",
        name: "RoleAdminChanged",
        type: "src::access_control_interface::RoleAdminChanged",
      },
      {
        kind: "nested",
        name: "GovernanceAdminAdded",
        type: "src::roles_interface::GovernanceAdminAdded",
      },
      {
        kind: "nested",
        name: "GovernanceAdminRemoved",
        type: "src::roles_interface::GovernanceAdminRemoved",
      },
      {
        kind: "nested",
        name: "UpgradeGovernorAdded",
        type: "src::roles_interface::UpgradeGovernorAdded",
      },
      {
        kind: "nested",
        name: "UpgradeGovernorRemoved",
        type: "src::roles_interface::UpgradeGovernorRemoved",
      },
    ],
  },
] as const satisfies Abi;
