import { Module, Global } from '@nestjs/common';
import { QueryService } from './services/query.service';
import { HttpService } from './services/http.service';

@Global()
@Module({
  providers: [QueryService, HttpService],
  exports: [QueryService, HttpService],
})
export class CommonModule {}
