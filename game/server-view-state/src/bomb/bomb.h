#pragma once

#include <string>
#include "common.h"

struct PendingBomb
{
    playerID_t id;
    uint8_t publicKey[PUBLIC_KEY_BS];
    std::string publicKeyStr;
    playerHP_t hp;
    playerHP_t maxHP;
    int damage;
    double coinsMultiplier;
    bombType_t bombType;
    bombCoordinate_t bombX, bombY, bombZ;
    uint64_t explodeAt;
};

void explodeBomb(const PendingBomb &bomb);
