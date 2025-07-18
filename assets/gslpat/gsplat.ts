import { _decorator, BufferAsset, Camera, Component, director, gfx, Mat4, MeshRenderer, PointToPointConstraint, Vec2, Vec3, Vec4 } from "cc";
import { plyParser } from "./ply-parser";
import { GSplatResource } from "./scene/gsplat-resource";
import { GSplatSorter } from "./scene/gsplat-sorter";
import { EDITOR } from "cc/env";
const { ccclass, property, executeInEditMode } = _decorator
const { Filter, SamplerInfo, Address } = gfx

let dataMap = new Map

function evalTextureSize(count) {
    const width = Math.ceil(Math.sqrt(count));
    const height = Math.ceil(count / width);
    return new Vec2(width, height);
}

let temp_mat4 = new Mat4
let temp_vec4 = new Vec4


const _samplerPointInfo = new SamplerInfo(
    Filter.POINT,
    Filter.POINT,
    Filter.NONE,
    Address.CLAMP,
    Address.CLAMP,
    Address.CLAMP,
);

let _pointSampler

function isBindingValid(binding: number) {
    return binding >= 0 && binding < 1000;
}


@ccclass('GSplat')
@executeInEditMode
export class GSplat extends Component {
    @property(BufferAsset)
    data: BufferAsset

    @property(Camera)
    camera: Camera

    splatOrder: gfx.Texture

    sorter: GSplatSorter

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

        let resource: GSplatResource = dataMap.get(this.data.uuid);
        if (!resource) {
            resource = new GSplatResource(splatData);
            dataMap.set(this.data.uuid, resource)
        }

        let mr = this.getComponent(MeshRenderer);
        if (!mr) {
            mr = this.addComponent(MeshRenderer)
        }

        mr.mesh = resource.mesh


        this.splatOrder = resource.createTexture('splatOrder', gfx.Format.R32UI, evalTextureSize(resource.numSplats))

        this.sorter = new GSplatSorter()
        this.sorter.init(this.splatOrder, resource.centers)

        if (!_pointSampler) {
            _pointSampler = director.root.device.getSampler(_samplerPointInfo)
        }

        let pass = mr.material.passes[0]
        let binding = pass.getBinding('splatOrder')
        if (isBindingValid(binding)) {
            pass.bindSampler(binding, _pointSampler)
            pass.bindTexture(binding, this.splatOrder);
        }

        // material.setParameter('splatColor', this.colorTexture);

        binding = pass.getBinding('transformA')
        pass.bindSampler(binding, _pointSampler)
        pass.bindTexture(binding, resource.transformATexture);

        binding = pass.getBinding('transformB')
        pass.bindSampler(binding, _pointSampler)
        pass.bindTexture(binding, resource.transformBTexture);

        mr.material.setProperty('numSplats', resource.numSplats)
        mr.material.setProperty('splatColor', resource.colorTexture);

    }

    lastCameraPosition = new Vec3
    lastCameraDirection = new Vec3
    protected update(dt: number): void {
        let camera = this.camera
        if (EDITOR) {
            camera = globalThis.cce.Camera._camera
        }

        if (camera) {
            let cameraPosition = camera.node.worldPosition;
            let cameraDirection = camera.node.forward;
            cameraDirection = cameraDirection.multiplyScalar(-1)
            const cameraMat = camera.node.worldMatrix;
            // cameraMat.getTranslation(cameraPosition);
            // cameraMat.getZ(cameraDirection);

            const modelMat = this.node.worldMatrix;
            const invModelMat = Mat4.invert(temp_mat4, modelMat);

            Vec3.transformMat4(cameraPosition, cameraPosition, invModelMat);

            temp_vec4.set(cameraDirection.x, cameraDirection.y, cameraDirection.z, 0)
            Vec3.transformMat4(temp_vec4, temp_vec4, invModelMat);
            cameraDirection.set(temp_vec4)


            // invModelMat.transformPoint(cameraPosition, cameraPosition);
            // invModelMat.transformVector(cameraDirection, cameraDirection);

            if (!cameraPosition.equals(this.lastCameraPosition) || !cameraDirection.equals(this.lastCameraDirection)) {
                this.lastCameraPosition.set(cameraPosition);
                this.lastCameraDirection.set(cameraDirection);
                this.sorter.setCamera(cameraPosition, cameraDirection);
            }
        }
    }
}