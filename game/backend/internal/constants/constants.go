// Package constants holds values shared across multiple backend packages
// that would otherwise be duplicated. Two groups today:
//
//   - Layer voxel counts: total voxels in each layer of the world, used
//     by admin (layer transitions) and stats manager (auto-transition on
//     a layer being fully destroyed).
//   - DB-manager message types: single-byte discriminators on the
//     achievements pub/sub channel; producers (controllers) and the
//     consumer (stats manager) must agree on values.
package constants

// Layer voxel counts. Values cascade from the innermost layer (5) outward
// so the totals stay consistent if a count changes. Typed as int64 to
// match the GameDB.SetNbVoxels{Dead,Alive} signature.
const (
	Layer5NbVoxels int64 = 4734976
	Layer4NbVoxels       = Layer5NbVoxels + 3784704
	Layer3NbVoxels       = Layer4NbVoxels + 3342336
	Layer2NbVoxels       = Layer3NbVoxels + 3440640
	Layer1NbVoxels       = Layer2NbVoxels + 1441792
	Layer0NbVoxels       = Layer1NbVoxels + 32768
)

// DB-manager message type bytes. The stats manager listens on the
// achievements channel and dispatches by this leading byte.
const (
	DBManagerVoxelDestroyedType uint8 = 30
	DBManagerAttackType         uint8 = 31
	DBManagerUpgradeType        uint8 = 32
	DBManagerStreakType         uint8 = 33
	DBManagerSkinType           uint8 = 34
	DBManagerLinkType           uint8 = 35
	DBManagerLayerType          uint8 = 36
	DBManagerAllyType           uint8 = 37
)

// Other wire-protocol message types (single leading byte). Producers in
// the Go backend and consumers in the C++ servers / TS client must agree.
const (
	NextPlayerType             uint8 = 10
	ChangeLayerType            uint8 = 9
	AchievementNotificationType uint8 = 40
)

// Redis pub/sub channel names. Strings (not numbers) because that's how
// redis represents them on the wire, but they're effectively opaque IDs.
const (
	RedisChannelPlayerDisconnected     = "2"
	RedisChannelViewServers            = "3"
	RedisChannelDBManager              = "4"
	RedisChannelKickPlayer             = "6"
	RedisChannelChangeLayer            = "7"
	RedisChannelAchievementNotification = "8"
)
