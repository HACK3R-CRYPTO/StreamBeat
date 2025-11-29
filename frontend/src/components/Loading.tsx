import React from 'react'
import IPhoneFrame from './iPhoneFrame';

const Loading = () => {
  return (
    <IPhoneFrame backgroundClassName="bg-black">
      <div className="flex flex-col items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mb-4"></div>
        <div className="text-white text-xl font-bold">Loading...</div>
      </div>
    </IPhoneFrame>
  )
}

export default Loading
