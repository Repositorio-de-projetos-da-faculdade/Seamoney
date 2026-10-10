import * as THREE from 'three'

// Planar reflection for the water: the scene seen by a camera mirrored in the sea plane, rendered at reduced
// resolution into a texture that the ocean shader samples with wave distortion. Everything below the waterline
// is clipped, so the underwater hull never shows up in its own reflection.

const BIAS = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1)

export function createReflection(scale: number) {
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType })
  const mirror = new THREE.PerspectiveCamera()
  const textureMatrix = new THREE.Matrix4()
  const clip = [new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.4)]
  const dir = new THREE.Vector3()
  const look = new THREE.Vector3()

  return {
    texture: target.texture,
    textureMatrix,
    setSize(width: number, height: number) {
      target.setSize(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)))
    },
    render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, hide: THREE.Object3D[]) {
      camera.getWorldDirection(dir)
      look.copy(camera.position).add(dir)
      mirror.copy(camera, false)
      mirror.position.set(camera.position.x, -camera.position.y, camera.position.z)
      mirror.up.set(camera.up.x, -camera.up.y, camera.up.z)
      mirror.lookAt(look.x, -look.y, look.z)
      mirror.updateMatrixWorld()
      mirror.projectionMatrix.copy(camera.projectionMatrix)
      textureMatrix.copy(BIAS).multiply(mirror.projectionMatrix).multiply(mirror.matrixWorldInverse)

      const previous = renderer.getRenderTarget()
      const autoShadows = renderer.shadowMap.autoUpdate
      hide.forEach((o) => (o.visible = false))
      renderer.shadowMap.autoUpdate = false
      renderer.clippingPlanes = clip
      renderer.setRenderTarget(target)
      renderer.clear()
      renderer.render(scene, mirror)
      renderer.clippingPlanes = []
      renderer.setRenderTarget(previous)
      renderer.shadowMap.autoUpdate = autoShadows
      hide.forEach((o) => (o.visible = true))
    },
    dispose() {
      target.dispose()
    },
  }
}
