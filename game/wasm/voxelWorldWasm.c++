#include <vector>
#include <emscripten.h>
#include <queue>
#include <functional>
#include <cstdlib> // malloc / free
#include <cstring> // memset / memcpy
using namespace std;

struct pos3
{
    int16_t x;
    int16_t y;
    int16_t z;
};
struct Positions
{
    int8_t pos[12];
};

struct Normals
{
    int8_t nor[12];
};

struct Colors
{
    float col[12];
};

struct UVs
{
    float uv[8];
};

struct Indices
{
    uint32_t ind[6];
};

struct LightS
{
    int8_t light[4];
};

typedef struct Pointers_
{
    int positionsSize;
    Positions *positions;
    int normalsSize;
    Normals *normals;
    int uvsSize;
    UVs *uvs;
    int indicesASize;
    Indices *indicesA;
    int coloursSize;
    Colors *colours;

    // Light Handling
    int lightPositionsSize;
    int32_t *lightPositions;

    int lightRGBSize;
    LightS *lightRGB;

    int lightPositionsCellSize;
    int16_t *lightPositionsCell;

} Pointers;

typedef struct PointersL_
{
    int coloursSize;
    Colors *colours;

    // Light Handling
    int lightPositionsSize;
    int32_t *lightPositions;

    int lightRGBSize;
    LightS *lightRGB;

    int lightPositionsCellSize;
    int16_t *lightPositionsCell;

} PointersL;

class VoxelWorldWorker
{
public:
    const float MIN_LIGHT_OFFSET = 0.1176f;
    const float MIN_LIGHTF = 1.0f;
    const float MAX_LIGHTF = 16.0f; // should be min + range : 1 + 15 = 16
    const int MAXLRANGE = 15;       // MAX_LIGHTF - MIN_LIGHTF;
    const int MAXLRANGE_1 = 14;

    const int STDRLEMISSION = 8;
    const int STDRLEMISSION2 = 16;

    const int STDRLEMISSION_1 = 7;
    const int STDRLEMISSION_12 = 9;

    float tileSXTW = 0;
    float pixelSize = 0;

    uint8_t cellSize = 0;
    uint16_t cellSliceSize = 0;
    uint16_t cellSize3 = 0;
    uint16_t tileSize = 0;
    uint16_t tileTextureWidth = 0;
    uint16_t tileTextureHeight = 0;
    uint16_t sizeX = 0;
    uint16_t sizeX1 = 0;
    uint16_t sizeY = 0;
    uint16_t sizeY1 = 0;
    uint16_t sizeZ = 0;
    uint16_t sizeZ1 = 0;
    uint_fast32_t sizeXY = 0;
    uint16_t sizeCellX = 0;
    uint8_t sizeCellXY = 0;
    uint8_t ocx = 0;
    uint8_t ocy = 0;
    uint8_t ocz = 0;

    int8_t *voxelData = nullptr;
    int8_t *light = nullptr;
    vector<int32_t> lightPosition;

    vector<int16_t> lightCellPosition;
    vector<LightS> lightRGB;

    Pointers pointers;
    PointersL pointersL;
    vector<Positions> positions;
    vector<Normals> normals;
    vector<UVs> uvs;
    vector<Colors> colours;
    vector<Indices> indicesA;

    struct LightNodeG
    {
        uint8_t x, y, z;
        int8_t light;

        LightNodeG(uint8_t x, uint8_t y, uint8_t z, int8_t light)
            : x(x), y(y), z(z), light(light) {}
    };

    struct LightNode
    {
        uint8_t x, y, z;
        int8_t lightR;
        int8_t lightG;
        int8_t lightB;

        LightNode(uint8_t x, uint8_t y, uint8_t z, int8_t lightR, int8_t lightG, int8_t lightB)
            : x(x), y(y), z(z), lightR(lightR), lightG(lightG), lightB(lightB) {}
    };

    std::queue<LightNodeG> lightQueue;
    std::queue<LightNodeG> lightQueueLinear;
    std::queue<LightNode> lightQueueEmitting;

    int16_t ALL_LAYERS_DATA[6][6] = {
        {256, 0, 256, 0, 256, 0},    // LAYER 0, 32768 voxels
        {112, 144, 0, 32, 112, 144}, // LAYER 1, 1441792 voxels
        {80, 176, 0, 160, 80, 176},  // LAYER 2, 3440640 voxels
        {48, 208, 0, 192, 48, 208},  // LAYER 3, 3342336 voxels
        {32, 224, 0, 224, 32, 224},  // LAYER 4, 3784704 voxels
        {16, 240, 0, 240, 16, 240}   // LAYER 5, 4734976 voxels
    };
    // curr layer is on the layer 5
    int16_t *currLayer = ALL_LAYERS_DATA[5];

    const int8_t voxelsGlow[28][4] = {
        // Bitcoin
        {1, 8, 8, 0},
        {0, 0, 0, 0},
        {1, 4, 4, 0},

        // ETH
        {1, 6, 0, 8},
        {0, 0, 0, 0},
        {1, 3, 0, 4},

        // CLI
        {1, 0, 8, 0},
        {0, 0, 0, 0},
        {1, 0, 4, 0},

        // Monero
        {1, 8, 2, 0},
        {0, 0, 0, 0},
        {1, 4, 1, 0},

        // FTX
        {1, 8, 4, 6},
        {0, 0, 0, 0},
        {1, 4, 2, 3},

        // Luna
        {1, 8, 6, 0},
        {0, 0, 0, 0},
        {1, 4, 3, 0},

        // Stonks
        {0, 0, 0, 0},

        // Tornado
        {1, 0, 4, 4},

        // Lazarus
        {0, 0, 0, 0},

        // WallStreetBet
        {1, 4, 4, 4},

        // Key
        {0, 0, 0, 0},

        // Doge
        {0, 0, 0, 0},

        // Starknet
        {1, 2, 0, 4},
        {0, 0, 0, 0},

        // Metacube
        {0, 0, 0, 0},
        {1, 0, 4, 0},
    };

    const int8_t neighborsOffsets[6][3] = {
        {1, 0, 0},
        {-1, 0, 0},
        {0, 1, 0},
        {0, -1, 0},
        {0, 0, 1},
        {0, 0, -1}};

    const int8_t neighborsOffsetsLin[5][3] = {
        {1, 0, 0},
        {-1, 0, 0},
        {0, 0, 1},
        {0, 0, -1}};

    typedef struct face
    {
        int8_t uvRow;
        int8_t dir[3];
        Normals dir4Times;
        int8_t pos[12];
        float uv[8];
    } Face;
    const uint8_t NB_FACES = 6;
    Face faces[6] = {{0,
                      {-1, 0, 0},
                      {-1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0},
                      {0, 1, 0,
                       0, 0, 0,
                       0, 1, 1,
                       0, 0, 1},
                      {0, 1, 0, 0, 1, 1, 1, 0}},
                     {0,
                      {1, 0, 0},
                      {1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0},
                      {1, 1, 1,
                       1, 0, 1,
                       1, 1, 0,
                       1, 0, 0},
                      {0, 1, 0, 0, 1, 1, 1, 0}},
                     {1,
                      {0, -1, 0},
                      {0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0},
                      {1, 0, 1,
                       0, 0, 1,
                       1, 0, 0,
                       0, 0, 0},
                      {1, 0, 0, 0, 1, 1, 0, 1}},
                     {2,
                      {0, 1, 0},
                      {0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0},
                      {0, 1, 1,
                       1, 1, 1,
                       0, 1, 0,
                       1, 1, 0},
                      {1, 1, 0, 1, 1, 0, 0, 0}},
                     {0,
                      {0, 0, -1},
                      {0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1},
                      {1, 0, 0,
                       0, 0, 0,
                       1, 1, 0,
                       0, 1, 0},
                      {0, 0, 1, 0, 0, 1, 1, 1}},
                     {0,
                      {0, 0, 1},
                      {0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1},
                      {0, 0, 1,
                       1, 0, 1,
                       0, 1, 1,
                       1, 1, 1},
                      {0, 0, 1, 0, 0, 1, 1, 1}}};

    void changeLayer(int layer)
    {
        this->currLayer = this->ALL_LAYERS_DATA[layer];
    }

    void setPropreties(int cellSize, int tileSize, int tileTextureWidth, int tileTextureHeight, int sizeX, int sizeY, int sizeZ, int sizeXY)
    {
        this->cellSize = cellSize;
        this->cellSliceSize = cellSize * cellSize;
        this->cellSize3 = cellSize * cellSize * cellSize;
        this->tileSize = tileSize;
        this->tileTextureWidth = tileTextureWidth;
        this->tileTextureHeight = tileTextureHeight;
        this->sizeX = sizeX;
        this->sizeX1 = sizeX - 1;
        this->sizeY = sizeY;
        this->sizeY1 = sizeY - 1;
        this->sizeZ = sizeZ;
        this->sizeZ1 = sizeZ - 1;
        this->sizeXY = sizeXY;
        this->sizeCellX = sizeX / cellSize;
        this->sizeCellXY = sizeXY / (this->cellSliceSize);
        this->tileSXTW = ((float)tileSize) / (float)tileTextureWidth;
        this->pixelSize = 1 / (float)tileTextureWidth; // padding offset
        float pixelVSize = 1 / (float)tileTextureHeight;

        for (int i = 0; i < NB_FACES; ++i)
        {
            float paddingVOffset = (float)pixelVSize * ((2.0f * (float)faces[i].uvRow) + 1.0f);
            for (int j = 1; j < 8; j += 2)
            {
                faces[i].uv[j] = 1.0f - (((float)faces[i].uvRow + 1.0f - (float)faces[i].uv[j]) * (float)tileSize) / (float)tileTextureHeight - paddingVOffset;
            }
        }
    }

    int32_t computeVoxelOffset(uint8_t x, uint8_t y, uint8_t z)
    {
        return x + y * sizeX + z * sizeXY;
    }

    int8_t getVoxel(uint8_t x, uint8_t y, uint8_t z)
    {
        return *(voxelData + computeVoxelOffset(x, y, z));
    }

    int8_t getCollision(int_fast16_t x, int_fast16_t y, int_fast16_t z)
    {
        // we check first if it is in the collision container
        // if not, we check if it is in the cells
        if (y < 0)
        {
            return -1;
        }
        else if (x < 0 || x >= sizeX || z < 0 || z >= sizeZ || y >= sizeY)
        {
            return 0;
        }
        return getVoxel(x, y, z);
    }

    void setVoxel(uint8_t x, uint8_t y, uint8_t z, int8_t value)
    {
        *(this->voxelData + computeVoxelOffset(x, y, z)) = value;
    }

    int8_t getVoxelBYO(uint_fast32_t index)
    {
        return *(this->voxelData + index);
    }

    int32_t computeLightOffset(uint8_t x, uint8_t y, uint8_t z)
    {
        return computeVoxelOffset(x, y, z) * 4;
    }

    int8_t *lightIndexPointer(int32_t index)
    {
        return this->light + index * 4;
    }

    int8_t *lightIndexPointerIndexed(int32_t index)
    {
        return this->light + index;
    }

    int8_t *lightPointer(uint8_t x, uint8_t y, uint8_t z)
    {
        return this->light + computeLightOffset(x, y, z);
    }

    int8_t getLightR(int8_t *voxelPointer)
    {
        return *(voxelPointer + 1) > *(voxelPointer) ? *(voxelPointer + 1) : *(voxelPointer);
    }

    int8_t getLightG(int8_t *voxelPointer)
    {
        return *(voxelPointer + 2) > *(voxelPointer) ? *(voxelPointer + 2) : *(voxelPointer);
    }

    int8_t getLightB(int8_t *voxelPointer)
    {
        return *(voxelPointer + 3) > *(voxelPointer) ? *(voxelPointer + 3) : *(voxelPointer);
    }

    void setGlobalLight(uint8_t x, uint8_t y, uint8_t z, uint8_t globalValue)
    {
        *(this->light + computeLightOffset(x, y, z)) = globalValue;
    }
    void setGlobalLightBYO(int8_t *lightPointer, int8_t globalValue)
    {
        *(lightPointer) = globalValue;
    }

    void setEmittingLight(uint8_t x, uint8_t y, uint8_t z, uint8_t voxelValueR, uint8_t voxelValueG, uint8_t voxelValueB)
    {
        auto *lightPointer = this->light + computeLightOffset(x, y, z);
        *(lightPointer + 1) = voxelValueR;
        *(lightPointer + 2) = voxelValueG;
        *(lightPointer + 3) = voxelValueB;
    }
    void setEmittingLightBYO(int8_t *lightPointer, int8_t voxelValueR, int8_t voxelValueG, int8_t voxelValueB)
    {
        *(lightPointer + 1) = voxelValueR;
        *(lightPointer + 2) = voxelValueG;
        *(lightPointer + 3) = voxelValueB;
    }

    int8_t getGlobalLight(int8_t *lightPointer)
    {
        return *(lightPointer);
    }
    int8_t getEmittingLightR(int8_t *lightPointer)
    {
        return *(lightPointer + 1);
    }
    int8_t getEmittingLightG(int8_t *lightPointer)
    {
        return *(lightPointer + 2);
    }
    int8_t getEmittingLightB(int8_t *lightPointer)
    {
        return *(lightPointer + 3);
    }

    Pointers *generateGeometryDataForCellThreaded(int cellID)
    {
        uint8_t cellZ = cellID / sizeCellXY;
        uint8_t cellY = (cellID - cellZ * sizeCellXY) / sizeCellX;
        uint8_t cellX = cellID - cellZ * sizeCellXY - cellY * sizeCellX;
        uint8_t startX = cellX * cellSize;
        uint8_t startY = cellY * cellSize;
        uint8_t startZ = cellZ * cellSize;

        vector<Positions> *positions = &this->positions;
        positions->clear();
        vector<Normals> *normals = &this->normals;
        normals->clear();
        vector<UVs> *uvs = &this->uvs;
        uvs->clear();
        vector<Colors> *colours = &this->colours;
        colours->clear();
        vector<Indices> *indicesA = &this->indicesA;
        indicesA->clear();

        for (uint8_t x = 0; x < cellSize; x++)
        {
            bool inLayerX = false;
            uint8_t voxelX = startX + x;
            if (voxelX < this->currLayer[0] || voxelX >= this->currLayer[1])
            {
                inLayerX = true;
            }

            for (uint8_t y = 0; y < cellSize; y++)
            {
                bool inLayerY = false;
                uint8_t voxelY = startY + y;
                if (voxelY < this->currLayer[2] || voxelY >= this->currLayer[3])
                {
                    inLayerY = true;
                }
                bool inLayerXY = inLayerX || inLayerY;

                for (uint8_t z = 0; z < cellSize; z++)
                {
                    uint8_t voxelZ = startZ + z;
                    if (inLayerXY || voxelZ < this->currLayer[4] || voxelZ >= this->currLayer[5])
                    {
                        setGlobalData(x, y, z, voxelX, voxelY, voxelZ, positions, normals, uvs, colours);
                    }
                }
            }
        }

        int positionsSize = positions->size() * 12;
        int sizeInd = positionsSize / 12;
        unsigned int ndx = 0;
        for (int i = 0; i < sizeInd; i++)
        {
            indicesA->push_back({ndx, ndx + 1, ndx + 2, ndx + 2, ndx + 1, ndx + 3});
            ndx += 4;
        }

        pointers.positionsSize = positionsSize;
        pointers.positions = positions->data();
        pointers.normalsSize = normals->size() * 12;
        pointers.normals = normals->data();
        pointers.uvsSize = uvs->size() * 8;
        pointers.uvs = uvs->data();
        pointers.indicesASize = indicesA->size() * 6;
        pointers.indicesA = indicesA->data();
        pointers.coloursSize = positionsSize;
        pointers.colours = colours->data();

        pointers.lightPositionsSize = this->lightPosition.size();
        pointers.lightPositions = this->lightPosition.data();
        pointers.lightRGBSize = this->lightRGB.size() * 4;
        pointers.lightRGB = this->lightRGB.data();

        pointers.lightPositionsCellSize = this->lightCellPosition.size();
        pointers.lightPositionsCell = this->lightCellPosition.data();

        return &pointers;
    }

    float occl(int8_t dx, int8_t dy, int8_t dz)
    {
        return getCollision(ocx + dx, ocy + dy, ocz + dz) ? 0.75 : 1;
    }

    void setGlobalData(uint8_t x, uint8_t y, uint8_t z, uint8_t voxelX, uint8_t voxelY, uint8_t voxelZ, vector<Positions> *positionsP, vector<Normals> *normalsP, vector<UVs> *uvsP, vector<Colors> *coloursP)
    {
        int8_t voxel = getVoxel(voxelX, voxelY, voxelZ);
        if (voxel > 0)
        {
            int8_t uvVoxel = voxel - 1;
            ocx = voxelX;
            ocy = voxelY;
            ocz = voxelZ;

            for (uint8_t i = 0; i < 6; i++)
            {
                auto *face = &faces[i];
                int_fast16_t neighborX = voxelX + face->dir[0];
                int_fast16_t neighborY = voxelY + face->dir[1];
                int_fast16_t neighborZ = voxelZ + face->dir[2];
                int8_t neighbor = getCollision(
                    neighborX,
                    neighborY,
                    neighborZ);
                if (!neighbor)
                {
                    positionsP->push_back({static_cast<int8_t>(face->pos[0] + x), static_cast<int8_t>(face->pos[1] + y), static_cast<int8_t>(face->pos[2] + z),
                                           static_cast<int8_t>(face->pos[3] + x), static_cast<int8_t>(face->pos[4] + y), static_cast<int8_t>(face->pos[5] + z),
                                           static_cast<int8_t>(face->pos[6] + x), static_cast<int8_t>(face->pos[7] + y), static_cast<int8_t>(face->pos[8] + z),
                                           static_cast<int8_t>(face->pos[9] + x), static_cast<int8_t>(face->pos[10] + y), static_cast<int8_t>(face->pos[11] + z)});
                    normalsP->push_back({face->dir4Times});
                    float paddingOffset = (float)pixelSize * ((2.0f * (float)uvVoxel) + 1.0f);
                    uvsP->push_back({
                        (((float)uvVoxel + face->uv[0]) * (float)tileSXTW) + paddingOffset,
                        face->uv[1],
                        (((float)uvVoxel + face->uv[2]) * (float)tileSXTW) + paddingOffset,
                        face->uv[3],
                        (((float)uvVoxel + face->uv[4]) * (float)tileSXTW) + paddingOffset,
                        face->uv[5],
                        (((float)uvVoxel + face->uv[6]) * (float)tileSXTW) + paddingOffset,
                        face->uv[7],
                    });

                    float lightFactorR = 1.0f;
                    float lightFactorG = 1.0f;
                    float lightFactorB = 1.0f;
                    if (isValidCoordinate(neighborX, neighborY, neighborZ))
                    {
                        auto *neighborVoxelPointer = lightIndexPointer(computeVoxelOffset(neighborX, neighborY, neighborZ));
                        lightFactorR = (((float)getLightR(neighborVoxelPointer) +
                                         MIN_LIGHTF) /
                                        MAX_LIGHTF);

                        lightFactorG = (((float)getLightG(neighborVoxelPointer) +
                                         MIN_LIGHTF) /
                                        MAX_LIGHTF);
                        lightFactorB = (((float)getLightB(neighborVoxelPointer) +
                                         MIN_LIGHTF) /
                                        MAX_LIGHTF);
                    }

                    float ra;
                    float rb;
                    float rc;
                    float rd;

                    if (i == 0) // -x
                    {
                        float a = occl(-1, 0, -1);
                        float b = occl(-1, 1, 0);
                        float c = occl(-1, 0, 1);
                        float d = occl(-1, -1, 0);

                        ra = a * b * occl(-1, 1, -1);
                        rc = c * b * occl(-1, 1, 1);
                        rb = a * d * occl(-1, -1, -1);
                        rd = c * d * occl(-1, -1, 1);
                        /* hautgauche | basgauche carré| hautdroite carré| basdroite */
                    }
                    else if (i == 1) // +x

                    {
                        float a = occl(1, 0, 1);
                        float b = occl(1, 1, 0);
                        float c = occl(1, 0, -1);
                        float d = occl(1, -1, 0);

                        ra = a * b * occl(1, 1, 1);
                        rc = c * b * occl(1, 1, -1);
                        rb = a * d * occl(1, -1, 1);
                        rd = c * d * occl(1, -1, -1);
                    }
                    else if (i == 2) // -y
                    {
                        float a = occl(0, -1, 1);
                        float b = occl(-1, -1, 0);
                        float c = occl(1, -1, 0);
                        float d = occl(0, -1, -1);

                        rb = a * b * occl(-1, -1, 1);
                        ra = a * c * occl(1, -1, 1);
                        rd = d * b * occl(-1, -1, -1);
                        rc = d * c * occl(1, -1, -1);
                        /*  downleft|downright|upperleft| upperright*/
                    }
                    else if (i == 3) // +y
                    {
                        float a = occl(0, 1, -1);
                        float b = occl(-1, 1, 0);
                        float c = occl(1, 1, 0);
                        float d = occl(0, 1, 1);

                        rc = a * b * occl(-1, 1, -1);
                        rd = a * c * occl(1, 1, -1);
                        ra = d * b * occl(-1, 1, 1);
                        rb = d * c * occl(1, 1, 1);
                    }
                    else if (i == 4) // -z
                    {
                        float a = occl(1, 0, -1);
                        float b = occl(0, 1, -1);
                        float c = occl(-1, 0, -1);
                        float d = occl(0, -1, -1);

                        rc = a * b * occl(1, 1, -1);
                        rd = c * b * occl(-1, 1, -1);
                        ra = a * d * occl(1, -1, -1);
                        rb = c * d * occl(-1, -1, -1);
                        /* downleft|downrigth|upperleft| upperright*/
                    }
                    else // +z
                    {
                        float a = occl(-1, 0, 1);
                        float b = occl(0, 1, 1);
                        float c = occl(1, 0, 1);
                        float d = occl(0, -1, 1);

                        rc = a * b * occl(-1, 1, 1);
                        rd = c * b * occl(1, 1, 1);
                        ra = a * d * occl(-1, -1, 1);
                        rb = c * d * occl(1, -1, 1);
                    }
                    coloursP->push_back({ra * lightFactorR, ra * lightFactorG, ra * lightFactorB,
                                         rb * lightFactorR, rb * lightFactorG, rb * lightFactorB,
                                         rc * lightFactorR, rc * lightFactorG, rc * lightFactorB,
                                         rd * lightFactorR, rd * lightFactorG, rd * lightFactorB});
                }
            }
        }
    }

    bool isExposedToSky(int_fast16_t x, int_fast16_t y1, int_fast16_t z)
    {
        if (isValidCoordinate(x, y1, z))
        {
            if (getVoxel(x, y1, z) == 0 && getGlobalLight(lightPointer(x, y1, z)) == MAXLRANGE)
            {
                return true;
            }
        }
        return false;
    }

    bool isValidCoordinate(int_fast16_t x, int_fast16_t y, int_fast16_t z)
    {
        return x >= 0 && x < sizeX && y >= 0 && y < sizeY && z >= 0 && z < sizeZ;
    }

    bool isBorderCoordinate(int_fast16_t x, int_fast16_t y, int_fast16_t z)
    {
        return x == 0 || x == sizeX1 || y == 0 || y == sizeY1 || z == 0 || z == sizeZ1;
    }

    bool isInnerCoordinate(int16_t x, int16_t y, int16_t z)
    {
        return x > 0 && x < sizeX1 && y > 0 && y < sizeY1 && z > 0 && z < sizeZ1;
    }

    void processEmittingInit()
    {
        const int8_t *neighborOffsetCurr;
        int8_t *neighborVoxelPointer;

        int_fast16_t nx, ny, nz;
        int32_t neighborIndex;
        while (!lightQueueEmitting.empty())
        {
            LightNode current = lightQueueEmitting.front();
            lightQueueEmitting.pop();
            for (int8_t i = 0; i < 6; i++)
            {
                neighborOffsetCurr = neighborsOffsets[i];
                nx = current.x + neighborOffsetCurr[0];
                ny = current.y + neighborOffsetCurr[1];
                nz = current.z + neighborOffsetCurr[2];

                if (isValidCoordinate(nx, ny, nz))
                {
                    neighborIndex = computeVoxelOffset(nx, ny, nz);
                    if (getVoxelBYO(neighborIndex) == 0)
                    {
                        neighborVoxelPointer = lightIndexPointer(neighborIndex);
                        compareNewIntensityEmitting(nx, ny, nz, current.lightR - 1, current.lightG - 1, current.lightB - 1, neighborVoxelPointer);
                    }
                }
            }
        }
    }

    void processEmitting()
    {
        const int8_t *neighborOffsetCurr;
        int8_t *neighborVoxelPointer;

        int_fast16_t nx, ny, nz;
        int32_t neighborIndex;
        while (!lightQueueEmitting.empty())
        {
            LightNode current = lightQueueEmitting.front();
            lightQueueEmitting.pop();
            for (int8_t i = 0; i < 6; i++)
            {
                neighborOffsetCurr = neighborsOffsets[i];
                nx = current.x + neighborOffsetCurr[0];
                ny = current.y + neighborOffsetCurr[1];
                nz = current.z + neighborOffsetCurr[2];

                if (isValidCoordinate(nx, ny, nz))
                {
                    neighborIndex = computeVoxelOffset(nx, ny, nz);
                    if (getVoxelBYO(neighborIndex) == 0)
                    {
                        neighborVoxelPointer = lightIndexPointer(neighborIndex);
                        compareNewIntensityEmitting(nx, ny, nz, current.lightR - 1, current.lightG - 1, current.lightB - 1, neighborVoxelPointer);
                    }
                }
            }
        }
    }
    void processLightPropagationLinear()
    {
        const int8_t *neighborOffsetCurr;

        int_fast16_t nx, ny, nz;
        int32_t neighborIndex;
        while (!lightQueueLinear.empty())
        {
            LightNodeG current = lightQueueLinear.front();
            lightQueueLinear.pop();

            for (int8_t i = 0; i < 4; i++)
            {
                neighborOffsetCurr = neighborsOffsetsLin[i];
                nx = current.x + neighborOffsetCurr[0];
                ny = current.y + neighborOffsetCurr[1];
                nz = current.z + neighborOffsetCurr[2];

                if (isValidCoordinate(nx, ny, nz)) // isInnerCoordinate
                {
                    neighborIndex = computeVoxelOffset(nx, ny, nz);
                    if (getVoxelBYO(neighborIndex) == 0 && getGlobalLight(lightIndexPointer(neighborIndex)) < MAXLRANGE_1)
                    {
                        setGlobalLight(nx, ny, nz, MAXLRANGE_1);
                        propagateLightInit(nx, ny, nz, MAXLRANGE_1);
                    }
                }
            }
        }
        processLightPropagationInit();
    }

    void initializeWorldLight()
    {
        int8_t voxelID;
        const int8_t *currVoxelGlow = nullptr;
        for (int16_t z = 0; z < sizeZ; z++)
        {
            bool inLayerX = false;
            if (z >= this->currLayer[4] && z < this->currLayer[5])
                inLayerX = true;

            int8_t *voxelZ = (this->voxelData + z * sizeXY);
            for (int16_t x = 0; x < sizeX; x++)
            {
                bool inLayerY = false;
                if (x >= this->currLayer[0] && x < this->currLayer[1])
                    inLayerY = true;

                int16_t minLVal = 0;
                if (inLayerX && inLayerY)
                    minLVal = this->currLayer[3];

                int8_t *voxelXZ = (voxelZ + x);
                setGlobalLight(x, sizeY1, z, MAXLRANGE);
                int16_t i = sizeY1 - 1;

                voxelID = *(voxelXZ + sizeY1 * sizeX);

                if (voxelID == 0)
                {
                    for (; i >= minLVal; i--)
                    {
                        if (*(voxelXZ + i * sizeX) != 0)
                        {
                            break;
                        }
                        setGlobalLight(x, i, z, MAXLRANGE);
                        propagateLightLinear(x, i, z, MAXLRANGE);
                    }
                }
                else
                {
                    currVoxelGlow = voxelsGlow[voxelID - 1];
                    if (currVoxelGlow[0] == 1)
                    {
                        setEmittingLight(x, sizeY1, z, currVoxelGlow[1], currVoxelGlow[2], currVoxelGlow[3]);
                        propagateEmittingInit(x, sizeY1, z, currVoxelGlow[1], currVoxelGlow[2], currVoxelGlow[3]);
                    }
                }
                for (; i >= minLVal; i--)
                {
                    voxelID = *(voxelXZ + i * sizeX);
                    if (voxelID > 0)
                    {
                        currVoxelGlow = voxelsGlow[voxelID - 1];
                        if (currVoxelGlow[0] == 1)
                        {
                            setEmittingLight(x, i, z, currVoxelGlow[1], currVoxelGlow[2], currVoxelGlow[3]);
                            propagateEmittingInit(x, i, z, currVoxelGlow[1], currVoxelGlow[2], currVoxelGlow[3]);
                        }
                    }
                }
                for (; i >= 0; i--)
                {
                    voxelID = *(voxelXZ + i * sizeX);
                    currVoxelGlow = voxelsGlow[voxelID - 1];
                    if (currVoxelGlow[0] == 1)
                    {
                        setEmittingLight(x, i, z, currVoxelGlow[1], currVoxelGlow[2], currVoxelGlow[3]);
                    }
                }
            }
        }
        processLightPropagationLinear();

        // Side borders (excluding corners)
        for (uint8_t y = 0; y < sizeY1; y++)
        {
            for (uint16_t z = 0; z < sizeZ; z++)
            {
                setAndPropagateInit(0, y, z, MAXLRANGE);
                setAndPropagateInit(sizeX1, y, z, MAXLRANGE);
            }

            for (uint8_t x = 1; x < sizeX1; x++)
            {
                setAndPropagateInit(x, y, 0, MAXLRANGE);
                setAndPropagateInit(x, y, sizeZ1, MAXLRANGE);
            }
        }

        processLightPropagationInit();
        processEmittingInit();
    }

    void setAndPropagateInit(uint8_t x, uint8_t y, uint8_t z, uint8_t globalValue)
    {
        setGlobalLight(x, y, z, globalValue);
        if (getVoxel(x, y, z) == 0)
        {
            propagateLightInit(x, y, z, globalValue);
        }
    }

    void removeLightSource(uint8_t x, uint8_t y, uint8_t z, int voxelType)
    {
        bool isEmittingVoxel = false;
        if (voxelType > 0 && voxelsGlow[voxelType - 1][0] == 1)
        {
            const int8_t *glowRow = voxelsGlow[voxelType - 1];
            isEmittingVoxel = true;
            // Propagate light from the neighbors border(at a border of 5 in each direction)
            setEmittingLight(x, y, z, 0, 0, 0);
            int8_t glowEmission = std::max({glowRow[1], glowRow[2], glowRow[3]});
            for (int16_t nx = x - glowEmission; nx <= x + glowEmission; nx++)
            {
                uint8_t dx = std::abs(nx - x);
                for (int16_t ny = y - glowEmission; ny <= y + glowEmission; ny++)
                {
                    uint8_t distxy = dx + std::abs(ny - y);
                    if (distxy > glowEmission)
                    {
                        continue;
                    }
                    for (int16_t nz = z - glowEmission; nz <= z + glowEmission; nz++)
                    {

                        uint8_t dist = distxy + std::abs(nz - z);
                        if (dist > glowEmission)
                        {
                            continue;
                        }
                        if (isValidCoordinate(nx, ny, nz))
                        {
                            int32_t neighborIndex = computeVoxelOffset(nx, ny, nz);
                            // int8_t neighborVoxelID = getVoxelBYO(neighborIndex);
                            if (dist < glowEmission && getVoxelBYO(neighborIndex) == 0)
                            {
                                setEmittingLight(nx, ny, nz, 0, 0, 0);
                            }

                            auto *neighborVoxelPointer = lightIndexPointer(neighborIndex);
                            propagateEmitting(nx, ny, nz, getEmittingLightR(neighborVoxelPointer), getEmittingLightG(neighborVoxelPointer), getEmittingLightB(neighborVoxelPointer));
                        }
                    }
                }
            }
        }
        if (isExposedToSky(x, y + 1, z))
        {
            setGlobalLight(x, y, z, MAXLRANGE);
            propagateLight(x, y, z, MAXLRANGE);
        }
        else if (isBorderCoordinate(x, y, z))
        {
            int8_t gLight = getGlobalLight(lightPointer(x, y, z));
            if (gLight > 1)
            {
                propagateLight(x, y, z, gLight);
            }
        }
        const int8_t *neighborOffsetCurr;
        for (int8_t i = 0; i < 6; i++)
        {
            neighborOffsetCurr = neighborsOffsets[i];
            int16_t nx = x + neighborOffsetCurr[0];
            int16_t ny = y + neighborOffsetCurr[1];
            int16_t nz = z + neighborOffsetCurr[2];
            if (isValidCoordinate(nx, ny, nz))
            {
                int32_t neighborIndex = computeVoxelOffset(nx, ny, nz);
                int8_t *neighborVoxelPointer = lightIndexPointer(neighborIndex);
                if (getVoxelBYO(neighborIndex) == 0)
                {
                    int8_t neighborVoxelL = getGlobalLight(neighborVoxelPointer);
                    if (neighborVoxelL > 1)
                    {
                        propagateLight(nx, ny, nz, neighborVoxelL);
                    }
                }
                if (isEmittingVoxel)
                {
                    continue;
                }
                // same for emitting light
                int8_t neighborVoxelER = getEmittingLightR(neighborVoxelPointer);
                int8_t neighborVoxelEG = getEmittingLightG(neighborVoxelPointer);
                int8_t neighborVoxelEB = getEmittingLightB(neighborVoxelPointer);
                if (neighborVoxelER > 1 || neighborVoxelEG > 1 || neighborVoxelEB > 1)
                {
                    propagateEmitting(nx, ny, nz, neighborVoxelER, neighborVoxelEG, neighborVoxelEB);
                }
            }
        }
        processLightPropagation();
        processEmitting();
    }

    void propagateLightLinear(uint8_t startX, uint8_t startY, uint8_t startZ, int8_t start)
    {
        lightQueueLinear.push({startX, startY, startZ, start});
    }

    void propagateLightInit(uint8_t startX, uint8_t startY, uint8_t startZ, int8_t start)
    {
        lightQueue.push({startX, startY, startZ, start});
    }

    void propagateLight(uint8_t startX, uint8_t startY, uint8_t startZ, int8_t start)
    {
        lightQueue.push({startX, startY, startZ, start});
        addLight(startX, startY, startZ);
    }

    void propagateEmittingInit(uint8_t startX, uint8_t startY, uint8_t startZ, int8_t startR, int8_t startG, int8_t startB)
    {
        lightQueueEmitting.push({startX, startY, startZ, startR, startG, startB});
    }

    void propagateEmitting(uint8_t startX, uint8_t startY, uint8_t startZ, int8_t startR, int8_t startG, int8_t startB)
    {
        lightQueueEmitting.push({startX, startY, startZ, startR, startG, startB});
        addLight(startX, startY, startZ);
    }

    int16_t computeCellId(uint8_t x, uint8_t y, uint8_t z)
    {
        uint8_t cellX = x / cellSize;
        uint8_t cellY = y / cellSize;
        uint8_t cellZ = z / cellSize;
        return cellX + cellY * sizeCellX + cellZ * sizeCellXY;
    }

    void addLight(uint8_t x, uint8_t y, uint8_t z)
    {
        int32_t voxelOff = computeLightOffset(x, y, z);
        for (int i = 0; i < lightPosition.size(); i++)
        {
            if (lightPosition[i] == voxelOff)
            {
                return;
            }
        }
        fillCellIdToUpdate(x, y, z);
        lightPosition.push_back(voxelOff);
    }

    void fillRGBLightFromLightPos()
    {
        for (int i = 0; i < lightPosition.size(); i++)
        {
            int8_t *voxelPointer = lightIndexPointerIndexed(lightPosition[i]);
            lightRGB.push_back({getGlobalLight(voxelPointer), getEmittingLightR(voxelPointer), getEmittingLightG(voxelPointer), getEmittingLightB(voxelPointer)});
        }
    }

    void checkIfNewLightCell(int16_t *lightCellToUpdate, int16_t lightCellToUpdateSize)
    {
        vector<int16_t> lightCellToUpdateVector(lightCellToUpdate, lightCellToUpdate + lightCellToUpdateSize);
        vector<int16_t> intersection;
        for (int i = 0; i < this->lightCellPosition.size(); i++)
        {
            if (find(lightCellToUpdateVector.begin(), lightCellToUpdateVector.end(), this->lightCellPosition[i]) != lightCellToUpdateVector.end())
            {
                intersection.push_back(this->lightCellPosition[i]);
            }
        }
        this->lightCellPosition = intersection;
    }

    void fillCellIdToUpdate(uint8_t x, uint8_t y, uint8_t z)
    {
        int16_t cellId = computeCellId(x, y, z);
        auto it = std::find(this->lightCellPosition.begin(), this->lightCellPosition.end(), cellId);
        if (it == this->lightCellPosition.end())
        {
            this->lightCellPosition.push_back(cellId);
        }
    }

    void processLightPropagation()
    {
        int8_t *voxelPointer;
        int8_t *neighborVoxelPointer;

        const int8_t *currVoxelGlow = nullptr;
        const int8_t *neighborOffsetCurr;

        int8_t newIntensity;

        int16_t nx, ny, nz;
        int32_t voxelIndex, neighborIndex;
        int8_t voxelID;

        while (!lightQueue.empty())
        {
            LightNodeG current = lightQueue.front();
            lightQueue.pop();
            voxelIndex = computeVoxelOffset(current.x, current.y, current.z);
            voxelPointer = lightIndexPointer(voxelIndex);

            for (int8_t i = 0; i < 6; i++)
            {

                neighborOffsetCurr = neighborsOffsets[i];
                nx = current.x + neighborOffsetCurr[0];
                ny = current.y + neighborOffsetCurr[1];
                nz = current.z + neighborOffsetCurr[2];

                if (isValidCoordinate(nx, ny, nz))
                {
                    neighborIndex = computeVoxelOffset(nx, ny, nz);
                    if (getVoxelBYO(neighborIndex) == 0)
                    {
                        int8_t eraseLight = current.light - 1;
                        if (isExposedToSky(nx, ny + 1, nz))
                        {
                            eraseLight = MAXLRANGE;
                        }
                        neighborVoxelPointer = lightIndexPointer(neighborIndex);
                        comparator(eraseLight, getGlobalLight(neighborVoxelPointer), neighborVoxelPointer, nx, ny, nz);
                    }
                }
            }
        }
    }

    void processLightPropagationInit()
    {
        int8_t *voxelPointer;
        const int8_t *currVoxelGlow = nullptr;
        const int8_t *neighborOffsetCurr;
        int8_t *neighborVoxelPointer;

        int8_t newIntensity;

        int_fast16_t nx, ny, nz;
        int_fast32_t neighborIndex;

        while (!lightQueue.empty())
        {
            LightNodeG current = lightQueue.front();
            lightQueue.pop();

            for (int8_t i = 0; i < 6; i++)
            {
                neighborOffsetCurr = neighborsOffsets[i];
                nx = current.x + neighborOffsetCurr[0];
                ny = current.y + neighborOffsetCurr[1];
                nz = current.z + neighborOffsetCurr[2];

                if (isValidCoordinate(nx, ny, nz))
                {
                    neighborIndex = computeVoxelOffset(nx, ny, nz);
                    if (getVoxelBYO(neighborIndex) == 0)
                    {
                        neighborVoxelPointer = lightIndexPointer(neighborIndex);
                        comparatorInit(current.light - 1, getGlobalLight(neighborVoxelPointer), neighborVoxelPointer, nx, ny, nz);
                    }
                }
            }
        }
    }

    void comparatorInit(int8_t lightI, int8_t light, int8_t *neighborLightPointer, int16_t nx, int16_t ny, int16_t nz)
    {
        if (lightI > light)
        {
            setGlobalLightBYO(neighborLightPointer, lightI);
            propagateLightInit(nx, ny, nz, lightI);
        }
    }

    void comparator(int8_t lightI, int8_t light, int8_t *neighborLightPointer, int16_t nx, int16_t ny, int16_t nz)
    {
        if (lightI > light)
        {
            setGlobalLightBYO(neighborLightPointer, lightI);
            propagateLight(nx, ny, nz, lightI);
        }
    }

    void compareNewIntensityEmitting(uint8_t nx, uint8_t ny, uint8_t nz, int8_t lightRI, int8_t lightGI, int8_t lightBI, int8_t *neighborVoxelPointer)
    {
        int8_t newIntensityR, newIntensityG, newIntensityB;
        int8_t lightR = getEmittingLightR(neighborVoxelPointer);
        int8_t lightG = getEmittingLightG(neighborVoxelPointer);
        int8_t lightB = getEmittingLightB(neighborVoxelPointer);
        bool condIntensity = false;
        if (lightRI > lightR)
        {
            newIntensityR = lightRI;
            condIntensity = true;
        }
        else
        {
            newIntensityR = lightR;
        }
        if (lightGI > lightG)
        {
            newIntensityG = lightGI;
            condIntensity = true;
        }
        else
        {
            newIntensityG = lightG;
        }
        if (lightBI > lightB)
        {
            newIntensityB = lightBI;
            condIntensity = true;
        }
        else
        {
            newIntensityB = lightB;
        }

        if (condIntensity == true)
        {
            setEmittingLightBYO(neighborVoxelPointer, newIntensityR, newIntensityG, newIntensityB);
            propagateEmittingInit(nx, ny, nz, newIntensityR, newIntensityG, newIntensityB);
        }
    }

    PointersL *generateGeometryLightData(int cellID)
    {
        uint8_t cellZ = cellID / sizeCellXY;
        uint8_t cellY = (cellID - cellZ * sizeCellXY) / sizeCellX;
        uint8_t cellX = cellID - cellZ * sizeCellXY - cellY * sizeCellX;
        uint8_t startX = cellX * cellSize;
        uint8_t startY = cellY * cellSize;
        uint8_t startZ = cellZ * cellSize;

        vector<Colors> *colours = &this->colours;
        colours->clear();

        for (uint8_t x = 0; x < cellSize; x++)
        {
            bool inLayerX = false;
            uint8_t voxelX = startX + x;
            if (voxelX < this->currLayer[0] || voxelX >= this->currLayer[1])
            {
                inLayerX = true;
            }

            for (uint8_t y = 0; y < cellSize; y++)
            {
                bool inLayerY = false;
                uint8_t voxelY = startY + y;
                if (voxelY < this->currLayer[2] || voxelY >= this->currLayer[3])
                {
                    inLayerY = true;
                }
                bool inLayerXY = inLayerX || inLayerY;

                for (uint8_t z = 0; z < cellSize; z++)
                {
                    uint8_t voxelZ = startZ + z;
                    if (inLayerXY || voxelZ < this->currLayer[4] || voxelZ >= this->currLayer[5])
                    {
                        setLightData(x, y, z, voxelX, voxelY, voxelZ, colours);
                    }
                }
            }
        }

        pointersL.colours = colours->data();
        pointersL.coloursSize = colours->size() * 12;

        // Must write into pointersL (the struct returned below) — writing into
        // `pointers` here left these 6 fields of pointersL uninitialized, so the
        // worker's updateLight read stale/zero light data.
        pointersL.lightPositionsSize = this->lightPosition.size();
        pointersL.lightPositions = this->lightPosition.data();
        pointersL.lightRGBSize = this->lightRGB.size() * 4;
        pointersL.lightRGB = this->lightRGB.data();

        pointersL.lightPositionsCellSize = this->lightCellPosition.size();
        pointersL.lightPositionsCell = this->lightCellPosition.data();
        return &pointersL;
    }

    void setLightData(uint8_t x, uint8_t y, uint8_t z, uint8_t voxelX, uint8_t voxelY, uint8_t voxelZ, vector<Colors> *coloursP)
    {
        if (getVoxel(voxelX, voxelY, voxelZ) > 0)
        {
            ocx = voxelX;
            ocy = voxelY;
            ocz = voxelZ;

            for (uint8_t i = 0; i < 6; i++)
            {
                auto *face = &faces[i];
                int_fast16_t neighborX = voxelX + face->dir[0];
                int_fast16_t neighborY = voxelY + face->dir[1];
                int_fast16_t neighborZ = voxelZ + face->dir[2];
                int8_t neighbor = getCollision(
                    neighborX,
                    neighborY,
                    neighborZ);
                if (!neighbor)
                {
                    float lightFactorR = 1.0f;
                    float lightFactorG = 1.0f;
                    float lightFactorB = 1.0f;
                    if (isValidCoordinate(neighborX, neighborY, neighborZ))
                    {
                        auto *neighborVoxelPointer = lightIndexPointer(computeVoxelOffset(neighborX, neighborY, neighborZ));
                        lightFactorR = (((float)getLightR(neighborVoxelPointer) +
                                         MIN_LIGHTF) /
                                        MAX_LIGHTF);

                        lightFactorG = (((float)getLightG(neighborVoxelPointer) +
                                         MIN_LIGHTF) /
                                        MAX_LIGHTF);
                        lightFactorB = (((float)getLightB(neighborVoxelPointer) +
                                         MIN_LIGHTF) /
                                        MAX_LIGHTF);
                    }

                    float ra;
                    float rb;
                    float rc;
                    float rd;

                    if (i == 0) // -x
                    {
                        float a = occl(-1, 0, -1);
                        float b = occl(-1, 1, 0);
                        float c = occl(-1, 0, 1);
                        float d = occl(-1, -1, 0);

                        ra = a * b * occl(-1, 1, -1);
                        rc = c * b * occl(-1, 1, 1);
                        rb = a * d * occl(-1, -1, -1);
                        rd = c * d * occl(-1, -1, 1);
                        /* hautgauche | basgauche carré| hautdroite carré| basdroite */
                    }
                    else if (i == 1) // +x

                    {
                        float a = occl(1, 0, 1);
                        float b = occl(1, 1, 0);
                        float c = occl(1, 0, -1);
                        float d = occl(1, -1, 0);

                        ra = a * b * occl(1, 1, 1);
                        rc = c * b * occl(1, 1, -1);
                        rb = a * d * occl(1, -1, 1);
                        rd = c * d * occl(1, -1, -1);
                    }
                    else if (i == 2) // -y
                    {
                        float a = occl(0, -1, 1);
                        float b = occl(-1, -1, 0);
                        float c = occl(1, -1, 0);
                        float d = occl(0, -1, -1);

                        rb = a * b * occl(-1, -1, 1);
                        ra = a * c * occl(1, -1, 1);
                        rd = d * b * occl(-1, -1, -1);
                        rc = d * c * occl(1, -1, -1);
                        /*  downleft|downright|upperleft| upperright*/
                    }
                    else if (i == 3) // +y
                    {
                        float a = occl(0, 1, -1);
                        float b = occl(-1, 1, 0);
                        float c = occl(1, 1, 0);
                        float d = occl(0, 1, 1);

                        rc = a * b * occl(-1, 1, -1);
                        rd = a * c * occl(1, 1, -1);
                        ra = d * b * occl(-1, 1, 1);
                        rb = d * c * occl(1, 1, 1);
                    }
                    else if (i == 4) // -z
                    {
                        float a = occl(1, 0, -1);
                        float b = occl(0, 1, -1);
                        float c = occl(-1, 0, -1);
                        float d = occl(0, -1, -1);

                        rc = a * b * occl(1, 1, -1);
                        rd = c * b * occl(-1, 1, -1);
                        ra = a * d * occl(1, -1, -1);
                        rb = c * d * occl(-1, -1, -1);
                        /* downleft|downrigth|upperleft| upperright*/
                    }
                    else // +z
                    {
                        float a = occl(-1, 0, 1);
                        float b = occl(0, 1, 1);
                        float c = occl(1, 0, 1);
                        float d = occl(0, -1, 1);

                        rc = a * b * occl(-1, 1, 1);
                        rd = c * b * occl(1, 1, 1);
                        ra = a * d * occl(-1, -1, 1);
                        rb = c * d * occl(1, -1, 1);
                    }
                    coloursP->push_back({ra * lightFactorR, ra * lightFactorG, ra * lightFactorB,
                                         rb * lightFactorR, rb * lightFactorG, rb * lightFactorB,
                                         rc * lightFactorR, rc * lightFactorG, rc * lightFactorB,
                                         rd * lightFactorR, rd * lightFactorG, rd * lightFactorB});
                }
            }
        }
    }
};

EMSCRIPTEN_KEEPALIVE
VoxelWorldWorker voxelWorld;

EMSCRIPTEN_KEEPALIVE
auto updateGeometry(uint8_t *voxelsToDestroy, int voxelsToDestroySize, int cellID)
{
    voxelWorld.lightCellPosition.clear();
    voxelWorld.lightPosition.clear();
    voxelWorld.lightRGB.clear();
    vector<int> voxelsToDestroyVector(voxelsToDestroySize / 3);
    int k = 0;
    for (int i = 0; i < voxelsToDestroySize; i += 3)
    {
        voxelsToDestroyVector[k++] = voxelWorld.getVoxel(voxelsToDestroy[i], voxelsToDestroy[i + 1], voxelsToDestroy[i + 2]);
        voxelWorld.setVoxel(voxelsToDestroy[i], voxelsToDestroy[i + 1], voxelsToDestroy[i + 2], 0);
    }
    k = 0;
    if (voxelsToDestroySize > 0)
    {
        for (int i = 0; i < voxelsToDestroySize; i += 3)
        {
            voxelWorld.removeLightSource(voxelsToDestroy[i], voxelsToDestroy[i + 1], voxelsToDestroy[i + 2], voxelsToDestroyVector[k++]);
        }
    }

    voxelWorld.fillRGBLightFromLightPos();
    return voxelWorld.generateGeometryDataForCellThreaded(cellID);
}

EMSCRIPTEN_KEEPALIVE
auto updateLight(uint8_t *voxelsToDestroy, int voxelsToDestroySize, int cellID, int16_t *lightCellToUpdate, int16_t lightCellToUpdateSize)
{

    voxelWorld.lightCellPosition.clear();
    voxelWorld.lightPosition.clear();
    voxelWorld.lightRGB.clear();
    vector<int> voxelsToDestroyVector(voxelsToDestroySize / 3);
    int k = 0;
    for (int i = 0; i < voxelsToDestroySize; i += 3)
    {
        voxelsToDestroyVector[k++] = voxelWorld.getVoxel(voxelsToDestroy[i], voxelsToDestroy[i + 1], voxelsToDestroy[i + 2]);
        voxelWorld.setVoxel(voxelsToDestroy[i], voxelsToDestroy[i + 1], voxelsToDestroy[i + 2], 0);
    }
    k = 0;
    if (voxelsToDestroySize > 0)
    {
        for (int i = 0; i < voxelsToDestroySize; i += 3)
        {
            voxelWorld.removeLightSource(voxelsToDestroy[i], voxelsToDestroy[i + 1], voxelsToDestroy[i + 2], voxelsToDestroyVector[k++]);
        }
    }
    voxelWorld.fillRGBLightFromLightPos();
    voxelWorld.checkIfNewLightCell(lightCellToUpdate, lightCellToUpdateSize);

    return voxelWorld.generateGeometryLightData(cellID);
}

EMSCRIPTEN_KEEPALIVE
auto initializeVoxelWorld(int sizeX, int sizeY, int sizeZ, int cellSize, int tileSize, int tileTextureWidth, int tileTextureHeight, uint8_t *geometry)
{
    int sizeXY = sizeX * sizeY;
    int sizeXYZ = sizeXY * sizeZ;
    voxelWorld.setPropreties(cellSize, tileSize, tileTextureWidth, tileTextureHeight, sizeX, sizeY, sizeZ, sizeXY);
    // Free any previous allocation before re-allocating, so a re-init does not
    // leak the old buffers. free(nullptr) is a no-op, so first init is unaffected.
    free(voxelWorld.voxelData);
    free(voxelWorld.light);
    voxelWorld.voxelData = (int8_t *)malloc(sizeXYZ);
    voxelWorld.light = (int8_t *)malloc(sizeXYZ * 4);
    memset(voxelWorld.light, 0, sizeXYZ * 4);
    memcpy(voxelWorld.voxelData, geometry, sizeXYZ);

    voxelWorld.initializeWorldLight();
    voxelWorld.lightPosition.clear();
    voxelWorld.lightRGB.clear();
    return voxelWorld.voxelData;
}

// Secondary worker: receives geometry copied from worker 0, does not run initializeVoxelWorld.
EMSCRIPTEN_KEEPALIVE
void initWorker(int sizeX, int sizeY, int sizeZ, int cellSize, int tileSize, int tileTextureWidth, int tileTextureHeight, int8_t *geometry)
{
    int sizeXY = sizeX * sizeY;
    int sizeXYZ = sizeXY * sizeZ;
    voxelWorld.setPropreties(cellSize, tileSize, tileTextureWidth, tileTextureHeight, sizeX, sizeY, sizeZ, sizeXY);
    // Free any previous allocation before re-allocating (free(nullptr) is a no-op).
    free(voxelWorld.voxelData);
    free(voxelWorld.light);
    voxelWorld.voxelData = (int8_t *)malloc(sizeXYZ);
    memcpy(voxelWorld.voxelData, geometry, sizeXYZ);

    voxelWorld.light = (int8_t *)malloc(sizeXYZ * 4);
    memset(voxelWorld.light, 0, sizeXYZ * 4);
    voxelWorld.initializeWorldLight();
    voxelWorld.lightPosition.clear();
    voxelWorld.lightRGB.clear();
}

EMSCRIPTEN_KEEPALIVE
void updateLayer(int layer)
{
    voxelWorld.changeLayer(layer);
}

EMSCRIPTEN_KEEPALIVE
auto getLightsData()
{
    return voxelWorld.light;
}
