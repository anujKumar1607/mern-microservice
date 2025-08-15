const ProductService = require("../services/product-service");

module.exports = (app) => {
    const service = new ProductService();
    app.use('/app-events',async (req,res,next) => {

        const { payload } = req.body;

        console.log("============= Products ================");
        // console.log(payload);
        // if(payload && payload.event === 'CREATE_ORDER'){
        //     if(payload && payload.data.order.items){
        //         payload.data.order.items.forEach(async (i, index) => {
        //             console.log("products",i.product._id, i.unit);
        //             await service.ManageProductInventory(i.product._id, i.unit)
        //         })
        //     }
        // }

        return res.status(200).json({ message: 'notified!'});
 
    });

}
