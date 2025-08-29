
import { _decorator, BufferAsset, Camera, Component, director, gfx, Mat4, MeshRenderer, PointToPointConstraint, Vec2, Vec3, Vec4 } from "cc";
import { plyParser } from "./ply-parser";
import { GSplatResource } from "./scene/gsplat-resource";
import { GSplatSorter } from "./scene/gsplat-sorter";
import { EDITOR } from "cc/env";
import { pcdLoader, PCDLoader } from "./pcd-loader";
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
let temp_vec3 = new Vec3


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
    _data: BufferAsset

    @property(BufferAsset)
    get data() {
        return this._data
    }
    set data(v) {
        this._data = v
        this.loadData()
    }

    protected async __preload() {
        this.loadData()
    }

    loadData() {
        if (!this.data) return

        let mr = this.getComponent(MeshRenderer);
        if (!mr) {
            mr = this.addComponent(MeshRenderer)
        }

        let buffer = this.data.buffer()
        let mesh = pcdLoader.parse(buffer)
        mr.mesh = mesh

    }

}