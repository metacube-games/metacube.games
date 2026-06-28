package achievement

import (
	"bytes"

	"backend/internal/constants"
)

func BuildNotificationMessage(
	publicKey string,
	category uint8,
	type_ uint8,
	achievement uint8,
) string {
	message := bytes.Buffer{}
	message.WriteByte(constants.AchievementNotificationType)
	message.WriteString(publicKey)
	message.WriteByte(category)
	message.WriteByte(type_)
	message.WriteByte(achievement)
	return message.String()
}
