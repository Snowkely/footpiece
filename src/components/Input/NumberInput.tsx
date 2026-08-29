import { useMemoizedFn } from 'ahooks';
import { Input } from 'antd';

// 表单验证
export const checkNumber = (
    value: string | number | undefined,
    required: boolean,
    info: string,
    intl: any,
) => {
    // console.log(typeof value);
    // console.log(value);
    if (value === '') {
        // 验证数字
        return Promise.reject(
            new Error(
                intl.formatMessage({
                    id: 'component.form.reset',
                }),
            ),
        );
    } else if (value === undefined && required) {
        // 验证是否是必填项
        return Promise.reject(new Error(info));
    } else {
        return Promise.resolve();
    }
};

type Props = {
    placeholder: string;
    onChange?: (value?: string | number | undefined) => void; // 这个是Form.Item 在渲染时会注入的
    value?: any; // 这个是Form.Item 在渲染时会注入的
};

// 在 React 中，value 从确定值改为 undefined 表示从受控变为非受控，因而不会重置展示值（但是 Form 中的值确实已经改变）。你可以通过 HOC 改变这一逻辑：即设置value = ''
const NumberInput: React.FC<Props> = ({ value = '', ...props }) => {
    const triggerChange = useMemoizedFn((changedValue?: string | number | undefined) => {
        props.onChange?.(changedValue);
    });

    const onNumberChange = useMemoizedFn((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.value === '') {
            // 在用户通过backspace键将input内容全部删除时触发
            triggerChange(undefined);
            return;
        }
        const floatReg = /^-?\d+(\.\d*)?$/; // 匹配正负浮点数,小数点后可为空
        const intReg = /^(?:0|(?:-?[1-9]\d*))$/; // 匹配正整数
        if (floatReg.test(e.target.value) || intReg.test(e.target.value)) {
            triggerChange(e.target.value);
        } else {
            triggerChange(value); // 当用户直接输入非数字或者输入数字后再输入非数字时触发
        }
    });

    return (
        <Input
            placeholder={props.placeholder}
            value={value}
            type="text"
            onChange={onNumberChange}
        />
    );
};

export default NumberInput;
