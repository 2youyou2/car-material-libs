import { _decorator, Component, MeshRenderer, Node, Vec3 } from 'cc';
import { EDITOR } from 'cc/env';
const { ccclass, property, executeInEditMode } = _decorator;

let _vec3_temp = new Vec3

@ccclass('mesh_size_ratio')
@executeInEditMode
export class mesh_size_ratio extends Component {
    start() {
this.updateRatio()
    }

    updateRatio() {
        let mr = this.getComponent(MeshRenderer)
        if (mr && mr.mesh) {
            let bounds = mr.model.worldBounds.halfExtents
            // let min = mr.mesh.struct.minPosition
            // let max = mr.mesh.struct.maxPosition

            // Vec3.subtract(_vec3_temp, max, min);

            mr.materials.forEach(mat => {
                mat.setProperty('sizeRatio', bounds.z / bounds.x)
            })
        }
    }

    update(deltaTime: number) {
        if (EDITOR) {
            this.updateRatio()
        }
    }
}


