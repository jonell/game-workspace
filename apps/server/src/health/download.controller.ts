import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';

@Controller()
export class DownloadController {
  @Get('download/agent')
  async downloadAgent(@Res() res: Response) {
    const filePath = join(process.cwd(), '../../uploads/agent.exe');
    res.download(filePath, 'ChunlvAgent.exe');
  }
}
