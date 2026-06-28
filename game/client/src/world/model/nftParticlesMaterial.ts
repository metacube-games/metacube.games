import * as THREE from "three";
import { shaderMaterial } from "@react-three/drei";
import { extend } from "@react-three/fiber";
import shaderTexturePNG from "../../assets/shaderTexture/electricTexture.png";

const fragmentShader = `
#include <common>

uniform vec3 iResolution;
uniform float iTime;

const float seed = 0.72;
const float particles = 30.0;
const float res = 48.0;
const float invRes = 1.0 / res;
const float direction = 1.98;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = (-iResolution.xy + 2.0 * fragCoord.xy) / iResolution.y;
  float clr = 0.0;
  float lengthUV = length(uv);
  float iSphere = 1.05 - lengthUV;

  if (iSphere > 0.0) {
    float invParticles = 1.0 / particles;
    for (float i = 0.0; i < particles; i += 1.0) {
      float particleRatio = i * invParticles;
      float seedModifier = seed + i + tan(seed);
      vec2 tPos = vec2(cos(seedModifier), sin(seedModifier));

      vec2 pPos = vec2(0.0, 0.0);
      float speed = (0.3142 * (cos(seedModifier) + 1.5)) + particleRatio;
      float timeOffset = iTime * speed + speed;
      float timecycle = fract(timeOffset);

      pPos = mix(tPos, pPos, direction - timecycle);

      vec4 r1 = vec4(vec2(step(pPos, uv)), 1.0 - vec2(step((particleRatio * invRes) + pPos + invRes, uv)));
      clr += (r1.x * r1.y) * (r1.z * r1.w * speed);
    }
  }
  fragColor = vec4(clr) * vec4(0.2, 0.2, 0.2, 1.0) * (1.0 - lengthUV);
}

varying vec2 vUv;

void main() {
  mainImage(gl_FragColor, vUv * iResolution.xy);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const vertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;

  vec4 mvPosition = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  vec3 scale = vec3(
    length(modelViewMatrix[0].xyz),
    length(modelViewMatrix[1].xyz),
    length(modelViewMatrix[2].xyz)
  );
  mvPosition.xyz += position * scale;
  gl_Position = projectionMatrix * mvPosition;
}
`;

const ParticleMaterial = shaderMaterial(
  {
    iTime: 0,
    iResolution: new THREE.Vector2(),
  },
  vertexShader,
  fragmentShader,
  (self) => {
    if (self) {
      self.side = THREE.DoubleSide;
      self.transparent = true;
    }
  },
);

extend({ ParticleMaterial });

const fragmentShader2 = `
#include <common>

uniform float iTime;
uniform vec2 iResolution;
uniform sampler2D iChannel0; // Assuming you have a texture
#define MOD3 vec3(.1031,.11369,.13787)

// Original noise code from https://www.shadertoy.com/view/4sc3z2
vec3 hash33(vec3 p3)
{
	p3 = fract(p3 * MOD3);
    p3 += dot(p3, p3.yxz+19.19);
    return -1.0 + 2.0 * fract(vec3((p3.x + p3.y)*p3.z, (p3.x+p3.z)*p3.y, (p3.y+p3.z)*p3.x));
}

float simplex_noise(vec3 p)
{
    const float K1 = 0.333333333;
    const float K2 = 0.166666667;

    vec3 i = floor(p + (p.x + p.y + p.z) * K1);
    vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);

    vec3 e = step(vec3(0.0), d0 - d0.yzx);
	vec3 i1 = e * (1.0 - e.zxy);
	vec3 i2 = 1.0 - e.zxy * (1.0 - e);

    vec3 d1 = d0 - (i1 - 1.0 * K2);
    vec3 d2 = d0 - (i2 - 2.0 * K2);
    vec3 d3 = d0 - (1.0 - 3.0 * K2);

    vec4 h = max(0.6 - vec4(dot(d0, d0), dot(d1, d1), dot(d2, d2), dot(d3, d3)), 0.0);
    vec4 n = h * h * h * h * vec4(dot(d0, hash33(i)), dot(d1, hash33(i + i1)), dot(d2, hash33(i + i2)), dot(d3, hash33(i + 1.0)));

    return dot(vec4(31.316), n);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 ouv = fragCoord/iResolution.xy;
    vec2 uv = (fragCoord - iResolution.xy*.5)/iResolution.y;

    float m = 0.;
    for(int i=0;i<3;i++){
        float f = floor(iTime*20.) + float(i)*.5;
        float b =
            simplex_noise(vec3(f, uv.y*1., 1.))*.15 +
            simplex_noise(vec3(f, uv.y*5., 5.))*.1 +
            simplex_noise(vec3(f, uv.y*15., 10.))*.02;

        float l = .000025+(uv.y+.5)*.00001;
        m += .0005/smoothstep(0., l*25e3, abs(b-uv.x));
    }

    m = min(m, 10.);

    vec4 ncol = vec4(1.) * m;

    fragColor = vec4(0,ncol.g,0, ncol.a);
}

varying vec2 vUv;

void main() {
  mainImage(gl_FragColor, vUv * iResolution.xy);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const vertexShader2 = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const texture = new THREE.TextureLoader().load(shaderTexturePNG);
const ElectricityMaterial = shaderMaterial(
  {
    iTime: 0,
    iResolution: new THREE.Vector2(),
    iChannel0: texture,
  },
  vertexShader2,
  fragmentShader2,
  (self) => {
    if (self) {
      self.side = THREE.FrontSide;
      self.transparent = true;
      self.depthWrite = false;

      // green
    }
  },
);

extend({ ElectricityMaterial });

const ElectricityMaterialPlane = shaderMaterial(
  {
    iTime: 0,
    iResolution: new THREE.Vector2(),
    iChannel0: texture,
  },
  vertexShader,
  fragmentShader2,
  (self) => {
    if (self) {
      self.side = THREE.FrontSide;
      self.transparent = true;
      self.depthWrite = false;
      // green
    }
  },
);

extend({ ElectricityMaterialPlane });
