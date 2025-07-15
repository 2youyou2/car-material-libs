import { SorterWorker } from "./gsplat-sorter-worker";
import { uploadTextureData } from "./utils";


export class GSplatSorter {
    orderTexture;
    centers
    worker
    init(orderTexture, centers, chunks?: any) {
        this.orderTexture = orderTexture;
        this.centers = centers.slice();

        // get the texture's storage buffer and make a copy
        const orderBuffer = new Uint32Array(orderTexture.width * orderTexture.height);
        // initialize order data
        for (let i = 0; i < orderBuffer.length; ++i) {
            orderBuffer[i] = i;
        }

        const obj = {
            order: orderBuffer,
            centers: centers,
            chunks: chunks
        };

        this.worker = new SorterWorker({
            onUpdate() {
                uploadTextureData(orderTexture, orderBuffer)
            }
        })

        // send the initial buffer to worker
        this.worker.postMessage(obj);
    }

    setCamera(pos, dir) {
        this.worker.postMessage({
            cameraPosition: { x: pos.x, y: pos.y, z: pos.z },
            cameraDirection: { x: dir.x, y: dir.y, z: dir.z }
        });

    }
}

