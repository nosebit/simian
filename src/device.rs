#[derive(Clone, Debug, PartialEq)]
pub enum Device {
    Cpu,
    Cuda(usize),
    Metal(usize),
}

impl Device {
    pub fn as_candle(&self) -> candle_core::Result<candle_core::Device> {
        match self {
            Device::Cpu => Ok(candle_core::Device::Cpu),
            Device::Cuda(idx) => candle_core::Device::new_cuda(*idx),
            Device::Metal(idx) => candle_core::Device::new_metal(*idx),
        }
    }
}
