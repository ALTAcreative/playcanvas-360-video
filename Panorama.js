/**
 * Simple solution for displaying 360 images and videos in PlayCanvas projects.
 * Usage: attach this script to a plane or mesh which is a child of 360-rotating camera setup.
 */

var Panorama = pc.createScript ('Panorama');


Panorama.helper = 'Start by attaching 360 image or video to the script. For best experience use assets with 2:1 ratio and POT dimensions.';
Panorama.attributes.add ('helper', {type: 'helper', title: ' ', default: Panorama.helper});
Panorama.attributes.add ('image', {type: 'asset', default: null, title: 'Image', assetType: 'texture'});
Panorama.attributes.add ('video', {type: 'asset', default: null, title: 'Video'});


Panorama.prototype.initialize = function()
{
    // creating 360 panoramic material with custom shader
    this.material = new pc.Material();
    this.material.shader = this.createShader ();
    
    // applying image or video texture to material
    this.texture = this.getTexture ();
    this.material.setParameter ('uTexture', this.texture);
    
    // applying material to the mesh
    if (this.entity.model && this.entity.model.model)
    {
        for (var i = 0; i < this.entity.model.model.meshInstances.length; i++)
        {
            this.entity.model.model.meshInstances[i].material = this.material;
        }
    }
    
    // bool flag for video texture uploading, see update() function
    this.upload = true;
};


Panorama.prototype.createShader = function ()
{
    var vertexShader = 
    [
        // standard vertex shader boilerplate
        
        'attribute vec3 aPosition;                                      \n',
        'uniform mat4 matrix_model;                                     \n',
        'uniform mat4 matrix_viewProjection;                            \n',
        'varying vec4 vPos;                                             \n',

        'void main(void)                                                \n',
        '{                                                              \n',
        '    vPos = matrix_model * vec4 (aPosition, 1.0);               \n',
        '    gl_Position = matrix_viewProjection * vPos;                \n',
        '}                                                              \n'
    ]
    .join ('');
    
    var fragmentShader =
    [
        // precision depends on device (mobile / desktop)
        'precision ' + this.app.graphicsDevice.precision + ' float;    \n',
        
        'varying vec4 vPos;                                            \n',
        'uniform sampler2D uTexture;                                   \n',

        'void main(void)                                               \n',
        '{                                                             \n',
             // calculating spherical coords from fragment position
        '    float u = 0.5 - 0.5 * atan (vPos.x, vPos.z) / 3.1415926;  \n',
        '    float xz = sqrt (vPos.x * vPos.x + vPos.z * vPos.z);      \n',
        '    float v = 1.0 - atan (xz, vPos.y) / 3.1415926;            \n',
        
             // sampling texture with calculated coords
        '    gl_FragColor = texture2D (uTexture, vec2 (u, v));         \n',
        '}                                                             \n'
    ]
    .join ('');
    
    var shaderDefinition =
    {
        attributes:
        {
            aPosition: pc.SEMANTIC_POSITION
        },
        vshader: vertexShader,
        fshader: fragmentShader
    };
    
    return new pc.Shader (this.app.graphicsDevice, shaderDefinition);
};


Panorama.prototype.getTexture = function ()
{
    var texture = null;
    
    if (this.image)
    {
        texture = this.app.assets.get(this.image).resource;
    }
    
    if (this.video)
    {
        texture = new pc.Texture (this.app.graphicsDevice,
        {
            format: pc.PIXELFORMAT_R5_G6_B5,
            autoMipmap: false
        });

        // custom mipmap settings for video texture
        texture.minFilter = pc.FILTER_LINEAR;
        texture.magFilter = pc.FILTER_LINEAR;
        texture.addressU = pc.ADDRESS_REPEAT;
        texture.addressV = pc.ADDRESS_CLAMP_TO_EDGE;

        // creating html video element and setting texture from it
        var video = document.createElement ('video');
        video.addEventListener ('canplay', function (e) { this.setSource (video); }.bind(texture));
        video.src = app.assets.get(this.video).getFileUrl();
        video.crossOrigin = 'anonymous';
        video.loop = true;
        video.play();
    }
    
    return texture;
};


Panorama.prototype.update = function (dt)
{
    // uploading video texture to GPU every 2nd frame
    
    if (this.upload && this.video)
        this.texture.upload();
    
    this.upload = !this.upload;
};
