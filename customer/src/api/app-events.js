const CustomerService = require("../services/customer-service");

module.exports = (app) => {
    
    const service = new CustomerService();
    app.use('/app-events',async (req,res,next) => {

        const { payload } = req.body;
        console.log("============= Customer1 ================");
        //handle subscribe events
        service.SubscribeEvents(payload);

        console.log("============= Customer ================");
        console.log(payload);
        res.json(payload);

    });

}
