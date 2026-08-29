import {
    createCustomer,
    deleteCustomer,
    deleteCustomerByIds,
    getCustomer,
    getCustomers,
    updateCustomer,
} from '@/services/im2m-golang/customers';
import { useRequest } from 'ahooks';

export default () => {
    // 获取所有customer信息
    const { runAsync: getCustomersRun } = useRequest(getCustomers, {
        manual: true,
    });

    // 根据id获取customer信息
    const { runAsync: getCustomerRun } = useRequest(getCustomer, {
        manual: true,
    });

    // 根据id删除customer
    const { runAsync: deleteCustomerRun, loading: deleteCustomerLoading } = useRequest(
        deleteCustomer,
        {
            manual: true,
        },
    );

    // 根据id批量删除customer
    const { runAsync: deleteCustomersRun, loading: deleteCustomersLoading } = useRequest(
        deleteCustomerByIds,
        {
            manual: true,
        },
    );

    // 更新customer
    const { runAsync: updateCustomerRun, loading: updateCustomerLoading } = useRequest(
        updateCustomer,
        {
            manual: true,
        },
    );

    // 更新customer
    const { runAsync: createCustomerRun, loading: createCustomerLoading } = useRequest(
        createCustomer,
        {
            manual: true,
        },
    );

    return {
        deleteCustomerLoading,
        deleteCustomersLoading,
        updateCustomerLoading,
        createCustomerLoading,
        getCustomersRun,
        deleteCustomerRun,
        deleteCustomersRun,
        getCustomerRun,
        updateCustomerRun,
        createCustomerRun,
    };
};
