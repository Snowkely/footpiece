declare namespace API {
    type BindAccountReq = {
        bellyShape?: string;
        bustChestShape?: string;
        customerName?: string;
        customerSize?: string;
        email?: string;
        password?: string;
        shoulderShape?: string;
        userName?: string;
    };

    type BindAccountResp = {
        customer?: Customer;
        email?: string;
        userName?: string;
    };

    type CreateCustomerReq = {
        bellyShape?: string;
        bustChestShape?: string;
        customerName?: string;
        customerSize?: string;
        shoulderShape?: string;
    };

    type CreateDummyReq = {
        dummyName?: string;
        dummySize?: string;
    };

    type CreateUserReq = {
        authId?: string;
        firstName?: string;
        lastName?: string;
    };

    type Customer = {
        bellyShape?: string;
        bustChestShape?: string;
        createdAt?: string;
        customerId?: string;
        idUser?: string;
        name?: string;
        shoulderShape?: string;
        size?: string;
        updatedAt?: string;
    };

    type CustomerInfo = {
        bellyShape?: string;
        bustChestShape?: string;
        customerId?: string;
        customerName?: string;
        customerSize?: CustomerSize;
        shoulderShape?: string;
    };

    type CustomerSize = {
        abdomen?: SizeDetail;
        acrossShoulder?: SizeDetail;
        ankle?: SizeDetail;
        armlength?: SizeDetail;
        backLength?: SizeDetail;
        backLengthBNP?: SizeDetail;
        bust?: SizeDetail;
        calf?: SizeDetail;
        crotchHeight?: SizeDetail;
        dartWidth?: SizeDetail;
        frontLength?: SizeDetail;
        height?: SizeDetail;
        highHip?: SizeDetail;
        hip?: SizeDetail;
        inseam?: SizeDetail;
        knee?: SizeDetail;
        outseam?: SizeDetail;
        rise?: SizeDetail;
        shoulderLength?: SizeDetail;
        thigh?: SizeDetail;
        waist?: SizeDetail;
        waistTrousers?: SizeDetail;
    };

    type DeleteAuthByEmailReq = {
        email?: string;
    };

    type deleteAuthParams = {
        /** auth id */
        id: string;
    };

    type DeleteByIdsReq = {
        ids?: string[];
    };

    type deleteCustomerParams = {
        /** customer id */
        id: string;
    };

    type deleteDownloadHistoryParams = {
        /** download history id */
        id: string;
    };

    type deleteDummyParams = {
        /** dummy id */
        id: string;
    };

    type deletePatternParams = {
        /** pattern id */
        id: string;
    };

    type downloadDxfFileParams = {
        /** cos key */
        cosKey: string;
    };

    type DownloadHistory = {
        cosKey?: string;
        createdAt?: string;
        historyId?: string;
        idCustomer?: string;
        idDummy?: string;
        idPattern?: string;
        idUser?: string;
        updatedAt?: string;
    };

    type DownloadHistoryData = {
        customer?: Customer;
        downloadHistory?: DownloadHistory;
        dummy?: Dummy;
        pattern?: Pattern;
    };

    type DownloadWithInfoReq = {
        cosKey?: string;
        customerId?: string;
        dummyId?: string;
        patternId?: string;
    };

    type Dummy = {
        createdAt?: string;
        dummyId?: string;
        idUser?: string;
        name?: string;
        size?: string;
        updatedAt?: string;
    };

    type DummySize = {
        abdomen?: SizeDetail;
        acrossShoulder?: SizeDetail;
        ankle?: SizeDetail;
        armlength?: SizeDetail;
        backLength?: SizeDetail;
        backLengthBNP?: SizeDetail;
        bust?: SizeDetail;
        calf?: SizeDetail;
        collarWidth?: SizeDetail;
        crotchHeight?: SizeDetail;
        dartWidth?: SizeDetail;
        frontLength?: SizeDetail;
        height?: SizeDetail;
        hem?: SizeDetail;
        highHip?: SizeDetail;
        hip?: SizeDetail;
        inseam?: SizeDetail;
        knee?: SizeDetail;
        outseam?: SizeDetail;
        rise?: SizeDetail;
        shoulderLength?: SizeDetail;
        thigh?: SizeDetail;
        waist?: SizeDetail;
        waistTrousers?: SizeDetail;
        waistband?: SizeDetail;
    };

    type DxfData = {
        cosKey?: string;
        dxfInfoList?: DxfInfo[];
    };

    type DxfEntity = {
        entityType?: string;
        points?: Point[];
    };

    type DxfInfo = {
        entities?: DxfEntity[];
        name?: string;
    };

    type GenerateDxfReq = {
        category?: string;
        customer?: CustomerInfo;
        customerStr?: string;
        dummyId?: string;
        dummyName?: string;
        dummySize?: DummySize;
        dummySizeStr?: string;
        dxfInfo?: DxfInfo[];
        dxfInfoStr?: string;
        gender?: string;
        patternId?: string;
        patternName?: string;
        patternSize?: PatternSize;
        patternSizeStr?: string;
    };

    type GenerateDxfResp = {
        customerId?: string;
        dummyId?: string;
        dxfData?: Record<string, any>;
        patternId?: string;
    };

    type getCustomerParams = {
        /** customer id */
        id: string;
    };

    type getCustomersParams = {
        /** 分页的当前页码 */
        page?: number;
        /** 分页的每页数量 */
        size?: number;
    };

    type GetCustomersResp = {
        customers?: Customer[];
        total?: number;
    };

    type getDownloadHistoriesParams = {
        /** 分页的当前页码 */
        page?: number;
        /** 分页的每页数量 */
        size?: number;
        /** 最近几个月的时间范围，单位为月，默认为3个月 */
        month?: number;
    };

    type GetDownloadHistoriesResp = {
        downloadHistoryData?: DownloadHistoryData[];
        total?: number;
    };

    type getDummiesParams = {
        /** 分页的当前页码 */
        page?: number;
        /** 分页的每页数量 */
        size?: number;
    };

    type GetDummiesResp = {
        dummies?: Dummy[];
        total?: number;
    };

    type getDummyParams = {
        /** dummy id */
        id: string;
    };

    type getPatternParams = {
        /** pattern id */
        id: string;
    };

    type getPatternsParams = {
        /** 分页的当前页码 */
        page?: number;
        /** 分页的每页数量 */
        size?: number;
        /** 按照category筛选 */
        category?: string;
    };

    type GetPatternsResp = {
        patterns?: Pattern[];
        total?: number;
    };

    type getUserParams = {
        /** user id */
        id: string;
    };

    type Hobby = {
        createdAt?: string;
        hobby?: string;
        hobbyID?: string;
        updatedAt?: string;
    };

    type HTTPResponse = {
        code?: number;
        data?: Record<string, any>;
        message?: Record<string, any>;
    };

    type JWTPayload = {
        accessJWT?: string;
        recoverPswJWT?: string;
        recoveryKey?: string;
        refreshJWT?: string;
        twoFA?: string;
        verifyEmailJWT?: string;
    };

    type LoadPatternReq = {
        patternId?: string;
    };

    type LoadPatternResp = {
        dxfInfo?: string;
        dxfInfoList?: DxfInfo[];
    };

    type LoginReq = {
        email?: string;
        password?: string;
    };

    type LoginResp = {
        authId?: string;
        email?: string;
        jwt?: JWTPayload;
    };

    type LogoutResp = true;

    type ParseDxfReq = {
        name?: string;
    };

    type ParseDxfResp = {
        dxfInfoList?: DxfInfo[];
    };

    type PasswordForgotReq = {
        email?: string;
    };

    type PasswordForgotResp = true;

    type PasswordRecoverJwtReq = {
        passNew?: string;
        passRepeat?: string;
        /** is required if 2FA is enabled for the user account */
        recoveryKey?: string;
    };

    type PasswordRecoverJwtResp = {
        /** is required if 2FA is enabled for the user account */
        recoveryKey?: string;
    };

    type PasswordUpdateReq = {
        passNew?: string;
        passRepeat?: string;
        password?: string;
    };

    type PasswordUpdateResp = true;

    type Pattern = {
        category?: string;
        createdAt?: string;
        dxfCosKey?: string;
        dxfInfo?: string;
        gender?: string;
        idDummy?: string;
        idUser?: string;
        name?: string;
        patternId?: string;
        patternSize?: string;
        updatedAt?: string;
    };

    type PatternSize = {
        abdomen?: SizeDetail;
        acrossShoulder?: SizeDetail;
        ankle?: SizeDetail;
        armlength?: SizeDetail;
        backLength?: SizeDetail;
        backLengthBNP?: SizeDetail;
        bust?: SizeDetail;
        calf?: SizeDetail;
        collarWidth?: SizeDetail;
        crotchHeight?: SizeDetail;
        dartWidth?: SizeDetail;
        frontLength?: SizeDetail;
        height?: SizeDetail;
        hem?: SizeDetail;
        highHip?: SizeDetail;
        hip?: SizeDetail;
        inseam?: SizeDetail;
        knee?: SizeDetail;
        outseam?: SizeDetail;
        rise?: SizeDetail;
        shoulderLength?: SizeDetail;
        thigh?: SizeDetail;
        waist?: SizeDetail;
        waistTrousers?: SizeDetail;
        waistband?: SizeDetail;
    };

    type Point = {
        gradingPoint?: string;
        gradingPointName?: string;
        orderNum?: number;
        patternPart?: string;
        refName?: string;
        selected?: boolean;
        x?: number;
        y?: number;
    };

    type Post = {
        body?: string;
        createdAt?: string;
        idUser?: string;
        postID?: string;
        title?: string;
        updatedAt?: string;
    };

    type RefreshReq = {
        authId?: string;
    };

    type RefreshResp = {
        accessJWT?: string;
        refreshJWT?: string;
    };

    type RegisterReq = {
        email?: string;
        password?: string;
    };

    type RegisterResp = {
        authId?: string;
        email?: string;
    };

    type SizeDetail = {
        name?: string;
        size?: number;
    };

    type UpdateCustomerReq = {
        bellyShape?: string;
        bustChestShape?: string;
        customerId?: string;
        customerName?: string;
        customerSize?: string;
        shoulderShape?: string;
    };

    type UpdateDummyReq = {
        dummyId?: string;
        dummyName?: string;
        dummySize?: string;
    };

    type UpdatePatternReq = {
        category?: string;
        dxfInfo?: string;
        name?: string;
        patternId?: string;
        patternSize?: string;
    };

    type UpdateUserReq = {
        firstName?: string;
        lastName?: string;
    };

    type User = {
        access?: string;
        createdAt?: string;
        firstName?: string;
        hobbies?: Hobby[];
        idAuth?: string;
        lastName?: string;
        patterns?: Pattern[];
        posts?: Post[];
        updatedAt?: string;
        userId?: string;
    };

    type VerifyEmailResp = true;
}
