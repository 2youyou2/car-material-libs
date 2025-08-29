import { _decorator } from "cc";
import { GSplat } from "./gsplat";
import { PointCloud2, PointField } from "./data/0606_proto";
import { EDITOR } from "cc/env";

const { ccclass, executeInEditMode } = _decorator



@ccclass('GSplat')
@executeInEditMode
export class DBGSplat extends GSplat {
    async __preload() {

        if (EDITOR) {
            const fs = require('fs-extra')
            let testPath = 'D:/workspace/cocos/projects/car-material-libs/assets/gslpat/data/2025_03_25-14_01_53.db3.bin'
            // let content = fs.readFileSync(testPath)


            const stream = fs.createReadStream(testPath, { start: 0, end: 100000 })

            let buffer = new Uint8Array(1000000)
            stream.on('data', function (chunk) {
                console.log(chunk);

                // let cloud = PointCloud2.decode(new Uint8Array(chunk.buffer))
                let cloud = PointField.decode(new Uint8Array(chunk.buffer))
                console.log(cloud)
            });

            // let cloud = PointCloud2.decode(new Uint8Array(content))
            // console.log(cloud)
        }
    }
}
