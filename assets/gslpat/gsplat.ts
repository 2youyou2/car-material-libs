import { _decorator, BufferAsset, Component, MeshRenderer } from "cc";
import { plyParser } from "./ply-parser";
import { GSplatResource } from "./scene/gsplat-resource";
const { ccclass, property, executeInEditMode } = _decorator

let dataMap = new Map

@ccclass('GSplat')
@executeInEditMode
export class GSplat extends Component {
    @property(BufferAsset)
    data: BufferAsset

    protected async __preload() {
        if (!this.data) {
            return
        }

        // console.log(this.data)

        let splatData = await plyParser.parse(this.data)

        // construct the resource
        // const resource = (splatData.isCompressed) ?
        // new GSplatCompressedResource(this.app.graphicsDevice, data) :
        // new GSplatResource(this.app.graphicsDevice, data.isCompressed ? data.decompress() : data);

        // const resource = new GSplatResource(splatData.isCompressed ? splatData.decompress() : splatData);

        let resource = dataMap.get(this.data.uuid);
        if (!resource) {
            resource = new GSplatResource(splatData);
            dataMap.set(this.data.uuid, resource)
        }

        let mr = this.getComponent(MeshRenderer);
        if (!mr) {
            mr = this.addComponent(MeshRenderer)
        }

        mr.mesh = resource.mesh

    }
}