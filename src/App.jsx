import React, { useRef, useState } from "react";
import { Canvas, useFrame, extend } from "@react-three/fiber";
import { useTexture, shaderMaterial } from "@react-three/drei";
import * as THREE from "three";

// ---------------------------------------------------------
// 1. 쉐이더 정의
// ---------------------------------------------------------
const CustomCardMaterial = shaderMaterial(
  {
    uTime: 0,
    uColorTexture: new THREE.Texture(),
    uHoloTexture: new THREE.Texture(),
    uUltraRareTexture: new THREE.Texture(),
    uMouse: new THREE.Vector2(0, 0),
    uRarity: 1.0,
  },
  // Vertex Shader
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment Shader
  `
    uniform float uTime;
    uniform sampler2D uColorTexture;
    uniform sampler2D uHoloTexture;
    uniform sampler2D uUltraRareTexture;
    uniform vec2 uMouse;
    uniform float uRarity; 
    varying vec2 vUv;

    void main() {
      vec4 baseColor = texture2D(uColorTexture, vUv);
      
      // 홀로그램 효과 마우스 따라가게
      vec2 holoUv = vUv;
      holoUv.x += uMouse.x * 0.5;
      holoUv.y -= uMouse.y * 0.5;
      
      vec4 holoColor = texture2D(uHoloTexture, holoUv);
      vec4 ultraRareColor = texture2D(uUltraRareTexture, holoUv);

      vec3 finalColor = baseColor.rgb;

      if (uRarity == 0.0) {
        finalColor = baseColor.rgb;
      } 
      else if (uRarity == 1.0) {
        float brightness = dot(baseColor.rgb, vec3(0.299, 0.587, 0.114));
        finalColor = mix(baseColor.rgb, holoColor.rgb, 0.3 + brightness * 0.2);
      }
      else if (uRarity == 2.0) {
        vec3 goldTint = vec3(1.0, 0.8, 0.0);
        vec3 goldBase = baseColor.rgb * goldTint; 
        finalColor = mix(goldBase, holoColor.rgb, 0.5); 
      }
      else if (uRarity == 3.0) {
        // [수정됨] holoColor 대신 ultraRareColor 사용 & 세미콜론 추가
        finalColor = mix(baseColor.rgb, ultraRareColor.rgb, 0.6); 
      }

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
);

extend({ CustomCardMaterial });

// ---------------------------------------------------------
// 2. 카드 컴포넌트
// ---------------------------------------------------------
const Card = ({ imageUrl, rarity }) => {
  const meshRef = useRef();
  const materialRef = useRef();

  const [hovered, setHover] = useState(false);

  const colorMap = useTexture(imageUrl);
  // [수정됨] 배열 [] 형태로 두 개의 텍스처를 묶어서 전달
  const [holoMap, ultraMap] = useTexture(["/hologram.jpg", "/UltraRare.jpg"]);

  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uMouse = state.pointer;
      materialRef.current.uRarity = rarity;
    }

    if (meshRef.current) {
      let targetRotationX = 0;
      let targetRotationY = 0;

      if (hovered) {
        targetRotationX = state.pointer.y * -0.5;
        targetRotationY = state.pointer.x * 0.5;
      }

      const damp = delta * 5;
      meshRef.current.rotation.x +=
        (targetRotationX - meshRef.current.rotation.x) * damp;
      meshRef.current.rotation.y +=
        (targetRotationY - meshRef.current.rotation.y) * damp;
    }
  });

  return (
    <mesh
      ref={meshRef}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
    >
      <planeGeometry args={[4.5, 6.3]} />
      <customCardMaterial
        ref={materialRef}
        uColorTexture={colorMap}
        uHoloTexture={holoMap}
        uUltraRareTexture={ultraMap}
        uRarity={rarity}
        transparent={true}
      />
    </mesh>
  );
};

// ---------------------------------------------------------
// 3. 메인 앱
// ---------------------------------------------------------
export default function App() {
  const [image, setImage] = useState("/pikachu.jpg");
  const [rarity, setRarity] = useState(1);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setImage(objectUrl);
    }
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#111",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          zIndex: 10,
          background: "rgba(255, 255, 255, 0.9)",
          padding: "20px",
          borderRadius: "10px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
        }}
      >
        <h3 style={{ margin: 0, color: "#333" }}>🎴 카드 메이커</h3>
        <label style={{ fontSize: "14px", fontWeight: "bold", color: "#555" }}>
          사진 선택
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ fontSize: "12px" }}
        />
        <label
          style={{
            fontSize: "14px",
            fontWeight: "bold",
            color: "#555",
            marginTop: "10px",
          }}
        >
          레어도 설정
        </label>
        <div style={{ display: "flex", gap: "5px" }}>
          <button onClick={() => setRarity(0)} style={btnStyle(rarity === 0)}>
            노말
          </button>
          <button onClick={() => setRarity(1)} style={btnStyle(rarity === 1)}>
            홀로그램
          </button>
          <button onClick={() => setRarity(2)} style={btnStyle(rarity === 2)}>
            골드
          </button>
          <button onClick={() => setRarity(3)} style={btnStyle(rarity === 3)}>
            울트라레어
          </button>
        </div>
      </div>

      <Canvas camera={{ position: [0, 0, 8] }}>
        <ambientLight intensity={1} />
        <React.Suspense fallback={null}>
          <Card imageUrl={image} rarity={rarity} />
        </React.Suspense>
      </Canvas>
    </div>
  );
}

const btnStyle = (isActive) => ({
  padding: "8px 12px",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
  backgroundColor: isActive ? "#646cff" : "#ddd",
  color: isActive ? "white" : "#333",
  fontWeight: "bold",
  transition: "0.2s",
});
