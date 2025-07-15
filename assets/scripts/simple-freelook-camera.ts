import { _decorator, Node, Component, Touch, clamp, Quat, Vec3, Vec2, EPSILON, EventMouse, EventTouch, sys, toRadian, view, input, Input, Camera, toDegree, IVec3Like, Mat4, IVec4Like } from 'cc';
const { sqrt, atan2, acos, tan, cos, sin, min, abs } = Math;
const { ccclass, property } = _decorator;



export function quarticDamp(current: number, target: number, dampTime: number, deltaTime: number) { // cuve like exponentialDecay but cost less
    let t = (1 - min(deltaTime, dampTime) / dampTime);
    let tt = t * t;
    return current + (target - current) * (1 - tt * tt);
}

export function Vec4_closeTo(a: IVec4Like, b: IVec4Like,) {
    return abs(a.x - b.x) + abs(a.y - b.y) + abs(a.z - b.z) + abs(a.w - b.w) <= EPSILON;
}

function Vec3_setFromSpherical(out: IVec3Like, s: Spherical) {
    const { radius, phi, theta } = s;
    let sinPhiRadius = sin(phi) * radius;
    out.x = sinPhiRadius * sin(theta);
    out.y = cos(phi) * radius;
    out.z = sinPhiRadius * cos(theta);
    return out;
}

export function Vec3_closeTo(a: IVec3Like, b: IVec3Like) {
    return abs(a.x - b.x) + abs(a.y - b.y) + abs(a.z - b.z) <= EPSILON;
}

export class SmoothDamper {
    private _velocity: number = 0;

    public smoothDamp(current: number, target: number, smoothTime: number, maxSpeed: number, deltaTime: number) {
        smoothTime = Math.max(0.0001, smoothTime);
        let num = 2 / smoothTime;
        let num2 = num * deltaTime;
        let num3 = 1 / (1 + num2 + 0.48 * num2 * num2 + 0.235 * num2 * num2 * num2);
        let num4 = current - target;
        let num5 = target;
        let num6 = maxSpeed * smoothTime;
        num4 = clamp(num4, -num6, num6);
        target = current - num4;
        let num7 = (this._velocity + num * num4) * deltaTime;
        this._velocity = (this._velocity - num * num7) * num3;
        let num8 = target + (num4 + num7) * num3;
        if (num5 - current > 0 == num8 > num5) {
            num8 = num5;
            this._velocity = (num8 - num5) / deltaTime;
        }
        return num8;
    }

    public Quat_smoothDamp(out: Quat, current: Quat, target: Quat, dampTime: number, deltaTime: number) {
        return Quat.lerp(out, current, target, this.smoothDamp(0, 1, dampTime, Infinity, deltaTime));
    }

    public Vec3_smoothDamp(out: Vec3, current: Vec3, target: Vec3, dampTime: number, deltaTime: number) {
        return Vec3.lerp(out, current, target, this.smoothDamp(0, 1, dampTime, Infinity, deltaTime));
    }
}

class Spherical {
    public radius: number;
    public phi: number; //垂直旋转角度
    public theta: number; //水平旋转角度

    constructor(radius: number = 1, phi: number = 0, theta: number = 0) {
        this.radius = radius;
        this.phi = phi;
        this.theta = theta;
    }

    public setFromVec3(v: Vec3) {
        return this.setFromCartesianCoords(v.x, v.y, v.z);
    }

    public setFromCartesianCoords(x: number, y: number, z: number) {
        this.radius = sqrt(x * x + y * y + z * z);
        if (this.radius === 0) {
            this.theta = 0;
            this.phi = 0;
        } else {
            this.theta = atan2(x, z);
            this.phi = acos(clamp(y / this.radius, - 1, 1));
        }
        return this;
    }
}


@ccclass("FreeLookParams")
export class FreeLookParams {
    @property({
        type: Node,
        displayName: "相机注视的节点",
        animatable: false
    })
    lookAt: Node | null = null;

    @property({
        displayName: "禁止水平方向旋转",
        animatable: false
    })
    forbidX: boolean = false;

    @property({
        displayName: "禁止垂直方向旋转",
        animatable: false
    })
    forbidY: boolean = false;

    @property({
        displayName: "禁止相机推移",
        animatable: false
    })
    forbidZ: boolean = false;

    @property({
        displayName: "旋转速度",
        animatable: false, range: [0.1, 5], step: 0.1, slide: true
    })
    rotateSpeed: number = 1;

    @property({
        displayName: "旋转阻尼系数",
        tooltip: "旋转阻尼系数\n数值越大旋转惯性越大",
        animatable: false, range: [0.1, 5], step: 0.1, slide: true
    })
    rotateSmoothing: number = 0.5;


    @property({
        displayName: "相机注视偏移",
        tooltip: "从LookAt目标的中心作局部空间的位置偏移。 \n所需区域不是跟踪目标的中心时，微调跟踪目标的位置",
    })
    trackedObjectOffset: Vec3 = new Vec3();


    @property({
        displayName: "最小俯仰角度",
    })
    phiMin: number = 0.01;

    @property({
        displayName: "最大俯仰角度",
    })
    phiMax: number = 90 - 0.01;

    thetaMin: number = -Infinity;
    thetaMax: number = Infinity;
    rotateTouchID: number = 0;
}

let __worldPos = new Vec3();
let __posDelta = new Vec3();
let __moveDelta = new Vec2();
let __xAxis = new Vec3();
let __yAxis = new Vec3();
let __loc0 = new Vec2();
let __loc1 = new Vec2();
let __preLoc0 = new Vec2();
let __preLoc1 = new Vec2();
let __rotation = new Quat();

@ccclass('SimpleFreeLookCamera')
export class SimpleFreeLookCamera extends Component {

    private _button: number = -1;
    private _rotateDelta: Vec2 = new Vec2();
    private _distanceScale: number = 1;
    private _spherical: Spherical = new Spherical();

    @property({ animatable: false, type: FreeLookParams })
    public freelook: FreeLookParams = new FreeLookParams();
    private _needUpdateRotate: boolean = false;

    public static Camera3D: Camera = null;

    onLoad() {
        SimpleFreeLookCamera.Camera3D = this.getComponent(Camera);
    }


    public onEnable() {
        input.on(Input.EventType.MOUSE_DOWN, this._onMouseDown, this);
        input.on(Input.EventType.MOUSE_UP, this._onMouseUp, this);
        input.on(Input.EventType.MOUSE_WHEEL, this._onMouseWheel, this);
        input.on(Input.EventType.MOUSE_MOVE, this._onMouseMove, this);
        input.on(Input.EventType.TOUCH_MOVE, this._onTouchMove, this);
        input.on(Input.EventType.TOUCH_END, this._onTouchEnd, this);
        input.on(Input.EventType.TOUCH_CANCEL, this._onTouchEnd, this);
        this._needUpdateRotate = true;
    }

    public onDisable() {
        input.off(Input.EventType.MOUSE_DOWN, this._onMouseDown, this);
        input.off(Input.EventType.MOUSE_UP, this._onMouseUp, this);
        input.off(Input.EventType.MOUSE_WHEEL, this._onMouseWheel, this);
        input.off(Input.EventType.MOUSE_MOVE, this._onMouseMove, this);
        input.off(Input.EventType.TOUCH_MOVE, this._onTouchMove, this);
        input.off(Input.EventType.TOUCH_END, this._onTouchEnd, this);
        input.off(Input.EventType.TOUCH_CANCEL, this._onTouchEnd, this);
    }

    private _getPreviousLocation(e: EventTouch | EventMouse | Touch, out: Vec2) {
        return e.getPreviousLocation(out);
    }

    private _getLocation(e: EventTouch | EventMouse | Touch, out: Vec2) {
        return e.getLocation(out);
    }

    private _onTouchMove(e: EventTouch) {
        if (!sys.isMobile) return;

        let freelook = this.freelook;
        let rotateTouchID = freelook.rotateTouchID;

        let touchs = e.getAllTouches();
        if (touchs.length > rotateTouchID + 1) {
            this._getPreviousLocation(touchs[rotateTouchID], __preLoc0);
            this._getPreviousLocation(touchs[rotateTouchID + 1], __preLoc1);
            this._getLocation(touchs[rotateTouchID], __loc0);
            this._getLocation(touchs[rotateTouchID + 1], __loc1);

            this._distanceScale *= this._calculateDistanceScale(Vec2.distance(__preLoc0, __preLoc1) / Vec2.distance(__loc0, __loc1));

            __preLoc0.add(__preLoc1).multiplyScalar(0.5);
            __loc0.add(__loc1).multiplyScalar(0.5);
        }
        else if (touchs.length > rotateTouchID) {
            this._rotateDelta.add(this._calculateRotateDelta(__moveDelta, this._getPreviousLocation(touchs[rotateTouchID], __loc0), this._getLocation(touchs[rotateTouchID], __loc1)));
        }
    }

    private _onTouchEnd(e: EventTouch) {

    }

    private _onMouseDown(e: EventMouse) {
        this._button = e.getButton();
    }

    private _onMouseUp(e: EventMouse) {
        this._button = -1;
    }

    private _onMouseWheel(e: EventMouse) {
        if (e.getScrollY() > 0) {
            this._distanceScale *= this._calculateDistanceScale(0.95);
        }
        else if (e.getScrollY() < 0) {
            this._distanceScale *= this._calculateDistanceScale(1 / 0.95);
        }
    }

    private _onMouseMove(e: EventMouse) {
        switch (this._button) {
            case EventMouse.BUTTON_LEFT:
                this._rotateDelta.add(this._calculateRotateDelta(__moveDelta, this._getPreviousLocation(e, __loc0), this._getLocation(e, __loc1)));
                break;
        }
    }


    private _calculateDistanceScale(scale: number) {
        return scale;
    }

    private _calculateRotateDelta(out: Vec2, loc0: Vec2, loc1: Vec2) {
        let freelook = this.freelook;
        Vec2.subtract(out, loc1, loc0).multiplyScalar(freelook.rotateSpeed * 2 * Math.PI / view.getVisibleSizeInPixel().height);
        return out;
    }

    public lateUpdate(deltaTime: number) {
        let freelook = this.freelook;

        if (freelook.lookAt) {
            Vec3.add(__worldPos, freelook.lookAt.worldPosition, freelook.trackedObjectOffset);
            let dampFactor = quarticDamp(1, 0, freelook.rotateSmoothing, deltaTime);
            if (abs(this._rotateDelta.x) + abs(this._rotateDelta.y) > 0.01 || this._distanceScale !== 1 || this._needUpdateRotate) {
                Vec3.subtract(__posDelta, this.node.worldPosition, __worldPos);
                this._spherical.setFromVec3(__posDelta);

                if (!freelook.forbidX) {
                    this._spherical.theta = clamp(this._spherical.theta - this._rotateDelta.x * (1 - dampFactor), freelook.thetaMin, freelook.thetaMax);
                }
                if (!freelook.forbidY) {
                    this._spherical.phi = clamp(this._spherical.phi + this._rotateDelta.y * (1 - dampFactor), toRadian(freelook.phiMin), toRadian(freelook.phiMax));
                }
                if (!freelook.forbidZ) {
                    this._spherical.radius = clamp(this._spherical.radius * this._distanceScale, 4.8, 8);
                }

                Vec3_setFromSpherical(__posDelta, this._spherical);
                const value = __posDelta.add(__worldPos).clone();

                if (!Vec3_closeTo(value, this.node.worldPosition)) {
                    this.node.worldPosition = value;
                }

                Quat.fromViewUp(__rotation, Vec3.subtract(__worldPos, this.node.worldPosition, __worldPos).normalize());
                if (!Vec4_closeTo(__rotation, this.node.worldRotation)) {
                    this.node.worldRotation = __rotation;
                }

                this._rotateDelta.multiplyScalar(dampFactor);
                this._distanceScale = 1;
                this._needUpdateRotate = false;
            }
        }
    }
}

