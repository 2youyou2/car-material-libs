// import { Debug } from '../../core/debug.js';
// import { Vec2 } from '../../core/math/vec2.js';
// import { BoundingBox } from '../../core/shape/bounding-box.js';
// import { ADDRESS_CLAMP_TO_EDGE, BUFFER_STATIC, FILTER_NEAREST, SEMANTIC_ATTR13, TYPE_UINT32 } from '../../platform/graphics/constants.js';
// import { Texture } from '../../platform/graphics/texture.js';
// import { VertexFormat } from '../../platform/graphics/vertex-format.js';
// import { VertexBuffer } from '../../platform/graphics/vertex-buffer.js';
// import { Mesh } from '../mesh.js';

import { director, geometry, gfx, Mesh, utils, Vec3 } from "cc";

/**
 * @import { GraphicsDevice } from '../../platform/graphics/graphics-device.js'
 * @import { GSplatData } from './gsplat-data.js';
 * @import { GSplatCompressedData } from './gsplat-compressed-data.js';
 * @import { GSplatSogsData } from './gsplat-sogs-data.js';
 */

/**
 * Base class for a GSplat resource and defines common properties.
 *
 *  @ignore
 */
class GSplatResourceBase {
    /** @type {GSplatData | GSplatCompressedData | GSplatSogsData} */
    gsplatData;

    /** @type {Float32Array} */
    centers;

    aabb = new geometry.AABB()

    mesh: Mesh;

    // /** @type {VertexBuffer} */
    // instanceIndices;

    constructor(gsplatData) {
        this.gsplatData = gsplatData;

        this.centers = new Float32Array(gsplatData.numSplats * 3);
        gsplatData.getCenters(this.centers);

        gsplatData.calcAabb(this.aabb);

        // construct the mesh

        // number of quads to combine into a single instance. this is to increase occupancy
        // in the vertex shader.
        const splatInstanceSize = 128;
        const numSplats = Math.ceil(gsplatData.numSplats / splatInstanceSize) * splatInstanceSize;
        const numSplatInstances = numSplats / splatInstanceSize;

        // specify the base splat index per instance
        const indexData = new Uint32Array(numSplatInstances);
        for (let i = 0; i < numSplatInstances; ++i) {
            indexData[i] = i * splatInstanceSize;
        }


        // build the instance mesh
        // const meshPositions = new Float32Array(12 * splatInstanceSize);
        // const meshIndices = new Uint32Array(6 * splatInstanceSize);
        let meshPositions = []
        let meshIndices = []

        for (let ins = 0; ins < numSplatInstances; ins++) {
            for (let i = 0; i < splatInstanceSize; ++i) {
                meshPositions.push(
                    -1, -1, i,
                    1, -1, i,
                    1, 1, i,
                    -1, 1, i
                );

                const b = (i + ins * splatInstanceSize) * 4;
                meshIndices.push(0 + b, 1 + b, 2 + b, 0 + b, 2 + b, 3 + b);
            }
        }

        let min = new Vec3
        let max = new Vec3
        this.aabb.getBoundary(min, max)

        // // 用 uvs 存储 indices 给 (顶点 shader 里的 vertex_id_attrib) 用
        // const meshUvs = [];
        // for (let i = 0; i < meshIndices.length; i++) {
        //     meshUvs[i * 2] = meshIndices[i]
        //     meshUvs[i * 2 + 1] = 0
        // }

        this.mesh = utils.createMesh({
            positions: meshPositions,
            indices: meshIndices,
            // uvs: meshUvs,
            minPos: min,
            maxPos: max
        })

        // this.mesh = new Mesh();
        // this.mesh.setPositions(meshPositions, 3);
        // this.mesh.setIndices(meshIndices);
        // this.mesh.update();

        // keep extra reference since mesh is shared between instances
        // this.mesh.incRefCount();

        // this.mesh.aabb.copy(this.aabb);


        // const vertexFormat = new VertexFormat(device, [
        //     { semantic: SEMANTIC_ATTR13, components: 1, type: TYPE_UINT32, asInt: true }
        // ]);
        // this.instanceIndices = new VertexBuffer(device, vertexFormat, numSplatInstances, {
        //     usage: BUFFER_STATIC,
        //     data: indexData.buffer
        // });
    }

    destroy() {
        this.mesh?.destroy();
        // this.instanceIndices?.destroy();
    }

    get instanceSize() {
        return 128; // number of splats per instance
    }

    get numSplats() {
        return this.gsplatData.numSplats;
    }

    configureMaterial(material) {
    }

    /**
     * Evaluates the size of the texture based on the number of splats.
     *
     * @param {number} count - Number of gaussians.
     * @returns {Vec2} Returns a Vec2 object representing the size of the texture.
     */
    evalTextureSize(count) {
        return Vec2.ZERO;
    }

    /**
     * Creates a new texture with the specified parameters.
     *
     * @param {string} name - The name of the texture to be created.
     * @param {number} format - The pixel format of the texture.
     * @param {Vec2} size - The size of the texture in a Vec2 object, containing width (x) and height (y).
     * @param {Uint8Array|Uint16Array|Uint32Array} [data] - The initial data to fill the texture with.
     * @returns {Texture} The created texture instance.
     */
    createTexture(name, format, size, data?: any) {
        const device = director.root!.device

        const width = size.x
        const height = size.y

        let texture = device.createTexture(new gfx.TextureInfo(
            gfx.TextureType.TEX2D,
            gfx.TextureUsageBit.SAMPLED | gfx.TextureUsageBit.TRANSFER_DST,
            format,
            width,
            height
        ));


        if (data) {
            this.uploadTextureData(texture, data)
        }

        return texture;

        // return new gfx.Texture(this.device, {
        //     name: name,
        //     width: size.x,
        //     height: size.y,
        //     format: format,
        //     cubemap: false,
        //     mipmaps: false,
        //     minFilter: FILTER_NEAREST,
        //     magFilter: FILTER_NEAREST,
        //     addressU: ADDRESS_CLAMP_TO_EDGE,
        //     addressV: ADDRESS_CLAMP_TO_EDGE,
        //     ...(data ? { levels: [data] } : {})
        // });
    }

    uploadTextureData(texture, data) {
        const device = director.root!.device
        let region = new gfx.BufferTextureCopy(undefined, undefined, texture.height, undefined, new gfx.Extent(texture.width, texture.height));
        device.copyBuffersToTexture([data], texture, [region]);
    }

}

export { GSplatResourceBase };
