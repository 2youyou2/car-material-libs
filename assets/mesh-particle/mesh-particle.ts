import { MeshRenderer } from 'cc';
import { ccenum, gfx, Mesh, ParticleSystem, randomRange, randomRangeInt, Vec3, Vec4 } from 'cc';
import { _decorator, Component, Node } from 'cc';
const { ccclass, property, executeInEditMode, type } = _decorator;

function getMeshData(mesh: Mesh) {
    const vertices = mesh.readAttribute(0, gfx.AttributeName.ATTR_POSITION)
    const normals = mesh.readAttribute(0, gfx.AttributeName.ATTR_NORMAL)
    const jointsIndices = mesh.readAttribute(0, gfx.AttributeName.ATTR_JOINTS)
    const weights = mesh.readAttribute(0, gfx.AttributeName.ATTR_WEIGHTS)
    const verticesCount = vertices.length / 3;
    mesh.struct.minPosition

    return {
        vertices,
        jointsIndices,
        weights,
        verticesCount,
        normals,
        minPosition: mesh.struct.minPosition,
        maxPosition: mesh.struct.maxPosition,
    }
}

enum EdgeType {
    None,
    X,
    Y,
    Z
}
ccenum(EdgeType)


@ccclass('mesh_particle')
@executeInEditMode
export class mesh_particle extends Component {
    get mesh() {
        return this._meshRenderer.mesh
    }

    @property(MeshRenderer)
    _meshRenderer: MeshRenderer
    @property(MeshRenderer)
    get meshRenderer() {
        return this._meshRenderer
    }
    set meshRenderer(v) {
        this._meshRenderer = v
        this.init()
    }


    @property(ParticleSystem)
    _particleSystem: ParticleSystem
    @property(ParticleSystem)
    get particleSystem() {
        return this._particleSystem
    }
    set particleSystem(v) {
        this._particleSystem = v
        this.init()
    }

    @type(EdgeType)
    _edgeType = EdgeType.None
    @type(EdgeType)
    get edgeType() {
        return this._edgeType
    }
    set edgeType(v) {
        this._edgeType = v
        this.init()
    }

    @property
    _edgeSlicedCount = 100
    @property({
        visible() {
            return this.edgeType !== EdgeType.None
        }
    })
    get edgeSlicedCount() {
        return this._edgeSlicedCount
    }
    set edgeSlicedCount(v) {
        this._edgeSlicedCount = v
        this.init()
    }

    @property
    _edgeSlicedDist = 0.1
    @property({
        visible() {
            return this.edgeType !== EdgeType.None
        },
    })
    get edgeSlicedDist() {
        return this._edgeSlicedDist
    }
    set edgeSlicedDist(v) {
        this._edgeSlicedDist = v
        this.init()
    }

    @property({
        visible() {
            return this.edgeType !== EdgeType.None
        },
        step: 0.01,
        min: 0,
        max: 1
    })
    edgeProgress = 0

    __preload() {

        this.init()
    }

    sliceMeshData(meshData, slicedPosEleIdx) {
        const eleNames = ['x', 'y', 'z']
        const eleName = eleNames[slicedPosEleIdx]
        let minEle = meshData.minPosition[eleName]
        let maxEle = meshData.maxPosition[eleName]

        let step = (maxEle - minEle) / this.edgeSlicedCount;

        let datas = []


        for (let sliceIdx = 0; sliceIdx < this.edgeSlicedCount; sliceIdx++) {
            let sliceEle = minEle + step * sliceIdx;

            for (let i = 0; i < meshData.verticesCount; i++) {
                let ele = meshData.vertices[i * 3 + slicedPosEleIdx];

                if (Math.abs(sliceEle - ele) > this.edgeSlicedDist) {
                    continue;
                }

                // let eleIndex = Math.floor((ele - minEle) / step)
                if (!datas[sliceIdx]) {
                    datas[sliceIdx] = {
                        vertices: [],
                        verticesCount: 0,
                        normals: [],
                    }
                }

                let subData = datas[sliceIdx]

                subData.verticesCount++;
                subData.vertices.push(meshData.vertices[i * 3 + 0])
                subData.vertices.push(meshData.vertices[i * 3 + 1])
                subData.vertices.push(meshData.vertices[i * 3 + 2])

                subData.normals.push(meshData.normals[i * 3 + 0])
                subData.normals.push(meshData.normals[i * 3 + 1])
                subData.normals.push(meshData.normals[i * 3 + 2])
            }
        }


        return datas
    }

    init() {
        if (!this._particleSystem || !this.mesh) {
            return
        }

        let meshData = getMeshData(this.mesh)

        let slicedMeshDatas = [meshData]
        if (this.edgeType === EdgeType.X) {
            slicedMeshDatas = this.sliceMeshData(meshData, 0)
        }
        else if (this.edgeType === EdgeType.Y) {
            slicedMeshDatas = this.sliceMeshData(meshData, 1)
        }
        else if (this.edgeType === EdgeType.Z) {
            slicedMeshDatas = this.sliceMeshData(meshData, 2)
        }

        let vec4_temp = new Vec4
        let vec3_temp = new Vec3

        const self = this

        const meshTransform = this.meshRenderer.node

        function emitFromMeshData(p: { position: Vec3, velocity: Vec3 }, meshData) {
            let vertexID = randomRangeInt(0, meshData.verticesCount);

            // position
            vec4_temp.set(
                meshData.vertices[vertexID * 3 + 0],
                meshData.vertices[vertexID * 3 + 1],
                meshData.vertices[vertexID * 3 + 2],
                1
            )

            if (meshTransform) {
                vec4_temp.transformMat4(meshTransform.worldMatrix)
            }
            p.position.set(vec4_temp)

            // velocity
            vec3_temp.set(
                meshData.normals[vertexID * 3 + 0],
                meshData.normals[vertexID * 3 + 1],
                meshData.normals[vertexID * 3 + 2],
            )
            if (meshTransform) {
                Vec3.transformMat4Normal(vec3_temp, vec3_temp, meshTransform.worldMatrix)
            }

            p.velocity.set(vec3_temp)
        }

        let shapeModule = this._particleSystem.shapeModule

        let _originEmit = shapeModule.emit
        shapeModule.emit = function (p: { position: Vec3, velocity: Vec3 }) {
            // _originEmit.call(this, p)

            if (self.edgeType === EdgeType.None) {
                emitFromMeshData(p, meshData)
            }
            else {
                let dataIdx = Math.floor(self.edgeProgress * self.edgeSlicedCount);
                let slicedData = slicedMeshDatas[dataIdx];
                while (!slicedData && dataIdx < slicedMeshDatas.length) {
                    dataIdx++;
                    slicedData = slicedMeshDatas[dataIdx];
                }
                if (!slicedData) {
                    // debugger
                    return
                }
                emitFromMeshData(p, slicedData)
            }

            if (shapeModule.randomPositionAmount) {
                p.position.x += randomRange(-shapeModule.randomPositionAmount, shapeModule.randomPositionAmount)
                p.position.y += randomRange(-shapeModule.randomPositionAmount, shapeModule.randomPositionAmount)
                p.position.z += randomRange(-shapeModule.randomPositionAmount, shapeModule.randomPositionAmount)
            }
        }
    }

    protected onEnable(): void {
    }

    start() {

    }

    update(deltaTime: number) {

    }
}


